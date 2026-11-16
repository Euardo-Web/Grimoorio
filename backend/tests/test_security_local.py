"""Isolated regression tests. No production database, network or cloud storage."""
import asyncio
import importlib
import os
import sys
from pathlib import Path
from unittest.mock import Mock
from urllib.parse import parse_qs, urlparse

import jwt
import pytest
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient

os.environ.update({
    "MONGO_URL": "mongodb://localhost:27017",
    "DB_NAME": "grimoorio_isolated_tests",
    "JWT_SECRET": "local-test-secret-with-more-than-32-characters",
    "APP_ENV": "development", "COOKIE_SECURE": "false",
    "FRONTEND_URL": "http://localhost:3000", "CORS_ORIGINS": "http://localhost:3000",
})
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
server = importlib.import_module("server")
ORIGIN = {"Origin": "http://localhost:3000"}


@pytest.fixture
def client(monkeypatch):
    database = AsyncMongoMockClient()["isolated"]
    monkeypatch.setattr(server, "db", database)
    # Avoid historical administrator settings and actual credentials.
    monkeypatch.delenv("ADMIN_EMAIL", raising=False)
    monkeypatch.delenv("ADMIN_PASSWORD", raising=False)
    monkeypatch.setattr(server, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(server, "GOOGLE_CLIENT_SECRET", "")
    monkeypatch.setattr(server, "GOOGLE_REDIRECT_URI", "")
    with TestClient(server.app, headers=ORIGIN) as session:
        yield session


def account(client, email="master@example.com", role="master"):
    client.cookies.clear()
    result = client.post("/api/auth/register", json={
        "email": email, "password": "StrongPassword123", "name": "Aventureiro", "role": role})
    assert result.status_code == 200, result.text
    return result.json(), dict(client.cookies)


def campaign(client, **kwargs):
    result = client.post("/api/campaigns", json={"name": "Campanha", **kwargs})
    assert result.status_code == 200, result.text
    return result.json()


def character(client, **kwargs):
    result = client.post("/api/characters", json={"name": "Herói", **kwargs})
    assert result.status_code == 200, result.text
    return result.json()


def test_no_default_admin(client):
    assert asyncio.run(server.db.users.count_documents({})) == 0


@pytest.mark.parametrize("password", ["short", "á" * 40])
def test_rejects_weak_or_oversized_password(client, password):
    result = client.post("/api/auth/register", json={"email": "a@example.com", "password": password, "name": "A"})
    assert result.status_code == 422


def test_session_cookie_and_logout_revocation(client):
    user, cookies = account(client)
    assert client.get("/api/auth/me").status_code == 200
    result = client.post("/api/auth/logout")
    assert result.status_code == 200
    assert not client.cookies.get("access_token")
    client.cookies.update(cookies)
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/refresh").status_code == 401


def test_refresh_after_access_expiry(client):
    user, _ = account(client)
    client.cookies.delete("access_token")
    client.cookies.set("access_token", "expired", domain="testserver.local", path="/")
    assert client.get("/api/auth/me").status_code == 401
    assert client.post("/api/auth/refresh").status_code == 200
    assert client.get("/api/auth/me").status_code == 200


def test_cookie_mutation_requires_trusted_origin(client):
    account(client)
    assert client.post("/api/campaigns", json={"name": "x"}, headers={"Origin": "https://evil.example"}).status_code == 403
    del client.headers["Origin"]
    assert client.post("/api/campaigns", json={"name": "x"}).status_code == 403


def test_rejects_oversized_json_before_parsing(client):
    result = client.post("/api/auth/login", content=b"x" * (server.MAX_JSON_BYTES + 1))
    assert result.status_code == 413


def test_private_file_not_readable_by_other_account(client, monkeypatch):
    owner, _ = account(client)
    asyncio.run(server.db.files.insert_one({"id": "private", "user_id": owner["id"],
        "is_deleted": False, "campaign_id": None, "storage_path": "private.png", "content_type": "image/png"}))
    storage = Mock(return_value=(b"image", "image/png"))
    monkeypatch.setattr(server, "get_object", storage)
    assert client.get("/api/files/private/download").status_code == 200
    account(client, "other@example.com")
    assert client.get("/api/files/private/download").status_code == 403
    assert storage.call_count == 1


def test_campaign_files_require_membership(client, monkeypatch):
    owner, cookies = account(client)
    camp = campaign(client)
    asyncio.run(server.db.files.insert_one({"id": "shared", "user_id": owner["id"],
        "is_deleted": False, "campaign_id": camp["id"], "storage_path": "x", "content_type": "application/pdf"}))
    monkeypatch.setattr(server, "get_object", Mock(return_value=(b"%PDF-test", "application/pdf")))
    account(client, "other@example.com")
    assert client.get("/api/files/shared/download").status_code == 403
    assert client.post("/api/campaigns/join", json={"code": camp["invite_code"]}).status_code == 200
    result = client.get("/api/files/shared/download")
    assert result.status_code == 200
    assert result.headers["content-disposition"] == "attachment"


def test_query_token_cannot_bypass_file_auth(client):
    account(client)
    token = client.cookies["refresh_token"]
    client.cookies.clear()
    assert client.get("/api/files/x/download", params={"auth": token}).status_code == 401


def test_cannot_update_or_import_into_foreign_campaign(client):
    _, _ = account(client)
    camp = campaign(client)
    account(client, "outsider@example.com")
    char = character(client)
    assert client.put(f"/api/characters/{char['id']}", json={"campaign_id": camp["id"]}).status_code == 403
    assert client.post("/api/characters/import", json={"name": "Fake", "campaign_id": camp["id"]}).status_code == 403


def test_character_update_validates_and_preserves_owner(client):
    user, _ = account(client)
    char = character(client)
    assert client.put(f"/api/characters/{char['id']}", json={"level": -3}).status_code == 422
    result = client.put(f"/api/characters/{char['id']}", json={
        "name": "Novo nome", "owner_id": "attacker", "history": [], "hp_current": 7})
    assert result.status_code == 200, result.text
    assert result.json()["owner_id"] == user["id"]
    assert result.json()["name"] == "Novo nome"
    assert len(result.json()["history"]) == 2


def test_cannot_attach_private_template_by_id(client):
    account(client)
    template = client.post("/api/templates", json={"name": "Privado", "system": "custom"}).json()
    account(client, "other@example.com")
    assert client.post("/api/campaigns", json={"name": "x", "template_id": template["id"]}).status_code == 403
    camp = campaign(client)
    assert client.patch(f"/api/campaigns/{camp['id']}", json={"template_id": template["id"]}).status_code == 403


def test_custom_model_fields_survive_create_update_import(client):
    account(client)
    template = client.post("/api/templates", json={"name": "Modelo", "system": "custom",
        "attributes_schema": [{"key": "poder", "label": "Poder"}],
        "sections": [{"label": "Recursos", "fields": [
            {"key": "mana", "label": "Mana", "type": "number", "default": 12},
            {"key": "inspirado", "label": "Inspirado", "type": "checkbox"}]}]})
    assert template.status_code == 200, template.text
    camp = campaign(client, template_id=template.json()["id"])
    char = character(client, campaign_id=camp["id"])
    assert char["custom_fields"] == {"mana": 12, "inspirado": False}
    updated = client.put(f"/api/characters/{char['id']}", json={"custom_fields": {"mana": 3, "inspirado": True}})
    assert updated.status_code == 200, updated.text
    imported = client.post("/api/characters/import", json=updated.json())
    assert imported.status_code == 200
    assert imported.json()["custom_fields"]["mana"] == 3
    assert client.delete(f"/api/templates/{template.json()['id']}").status_code == 409


@pytest.mark.parametrize("schema", [
    [{"key": "x", "label": "One"}, {"key": "x", "label": "Two"}],
    [{"key": "$operator", "label": "Invalid"}],
    [{"key": "good", "label": ""}],
])
def test_invalid_model_schemas_are_rejected(client, schema):
    account(client)
    assert client.post("/api/templates", json={"name": "Bad", "system": "custom", "attributes_schema": schema}).status_code == 422


@pytest.mark.parametrize("expression", ["999d20", "1d0", "1d1", "100d20+1d6", "1d20garbage", "1d20**3", "", "1" * 201])
def test_dice_limits(expression):
    with pytest.raises((ValueError, OverflowError)):
        server.roll_expression(expression)


def test_valid_dice():
    result = server.roll_expression("2d6+3")
    assert 5 <= result["total"] <= 15
    assert len(result["breakdown"][0]["rolls"]) == 2


def test_upload_rejects_unsafe_type_and_oversized_data(client, monkeypatch):
    account(client)
    storage = Mock()
    monkeypatch.setattr(server, "put_object", storage)
    assert client.post("/api/files/upload", files={"file": ("bad.html", b"<script></script>", "text/html")}).status_code == 415
    assert client.post("/api/files/upload", files={"file": ("fake.png", b"not-an-image", "image/png")}).status_code == 415
    assert client.post("/api/files/upload", files={"file": ("big.txt", b"x" * (server.MAX_UPLOAD_BYTES + 1), "text/plain")}).status_code == 413
    storage.assert_not_called()


def test_upload_valid_image(client, monkeypatch):
    account(client)
    monkeypatch.setattr(server, "put_object", lambda path, data, ct: {"path": path})
    result = client.post("/api/files/upload", files={"file": ("x.png", b"\x89PNG\r\n\x1a\nimage", "image/png")})
    assert result.status_code == 200, result.text
    assert result.json()["content_type"] == "image/png"


def test_login_rate_limit(client):
    for _ in range(20):
        assert client.post("/api/auth/login", json={"email": "none@example.com", "password": "invalid"}).status_code == 401
    assert client.post("/api/auth/login", json={"email": "none@example.com", "password": "invalid"}).status_code == 429


def test_google_disabled_without_configuration(client):
    assert client.get("/api/auth/providers").json() == {"google": False}
    assert client.get("/api/auth/google/start").status_code == 503


def enable_google(monkeypatch):
    monkeypatch.setattr(server, "GOOGLE_CLIENT_ID", "client-test")
    monkeypatch.setattr(server, "GOOGLE_CLIENT_SECRET", "test-only")
    monkeypatch.setattr(server, "GOOGLE_REDIRECT_URI", "http://testserver/api/auth/google/callback")


def test_google_requires_matching_state_cookie(client, monkeypatch):
    enable_google(monkeypatch)
    result = client.get("/api/auth/google/callback?state=forged&code=invalid", follow_redirects=False)
    assert result.status_code == 302
    assert "oauth_error=" in result.headers["location"]


def google_flow(client, monkeypatch, claims_override=None):
    enable_google(monkeypatch)
    start = client.get("/api/auth/google/start?role=master", follow_redirects=False)
    params = parse_qs(urlparse(start.headers["location"]).query)
    assert params["code_challenge_method"] == ["S256"]
    claims = {"sub": "google-user-123", "email": "google@example.com",
        "email_verified": True, "nonce": params["nonce"][0], "name": "Google Hero"}
    claims.update(claims_override or {})
    monkeypatch.setattr(server.requests, "post", Mock(return_value=Mock(
        raise_for_status=Mock(), json=Mock(return_value={"id_token": "verified-by-mock"}))))
    from google.oauth2 import id_token
    monkeypatch.setattr(id_token, "verify_oauth2_token", Mock(return_value=claims))
    return client.get("/api/auth/google/callback", params={"state": params["state"][0], "code": "test-code"}, follow_redirects=False)


def test_google_creates_verified_user_and_session(client, monkeypatch):
    result = google_flow(client, monkeypatch)
    assert result.headers["location"] == "http://localhost:3000/app", result.headers
    me = client.get("/api/auth/me").json()
    assert me["email"] == "google@example.com"
    assert me["role"] == "master"
    assert "oauth_state" not in client.cookies


@pytest.mark.parametrize("claims", [{"email_verified": False}, {"nonce": "wrong"}])
def test_google_rejects_invalid_claims(client, monkeypatch, claims):
    result = google_flow(client, monkeypatch, claims)
    assert "oauth_error=" in result.headers["location"]
    assert client.get("/api/auth/me").status_code == 401


def test_google_does_not_silently_link_password_account(client, monkeypatch):
    account(client, "google@example.com")
    client.cookies.clear()
    result = google_flow(client, monkeypatch)
    assert "oauth_error=" in result.headers["location"]
    assert client.get("/api/auth/me").status_code == 401


def test_security_headers(client):
    result = client.get("/api/")
    assert result.headers["x-content-type-options"] == "nosniff"
    assert result.headers["x-frame-options"] == "DENY"

# Resource photographs share upload checks, but access follows the owning entity.
PNG = b"\x89PNG\r\n\x1a\nimage"
def image_upload(client, kind, rid, content=PNG, name="photo.png", mime="image/png"):
    return client.post(f"/api/images/{kind}/{rid}", files={"file": (name, content, mime)})

@pytest.fixture
def image_storage(monkeypatch):
    objects = {}
    def put(path, data, ct):
        objects[path] = (data, ct)
        return {"path": path}
    monkeypatch.setattr(server, "put_object", put)
    monkeypatch.setattr(server, "get_object", lambda path: objects[path])
    return objects

def test_campaign_cover_owner_member_outsider(client, image_storage):
    _, owner = account(client)
    camp = campaign(client)
    uploaded = image_upload(client, "campaigns", camp["id"])
    assert uploaded.status_code == 200, uploaded.text
    fid = uploaded.json()["cover_file_id"]
    assert client.get(f"/api/files/{fid}/download").content == PNG
    # Resource images do not appear in the unrelated attachment gallery.
    assert client.get("/api/files", params={"campaign_id": camp["id"]}).json() == []
    account(client, "member@example.com", "player")
    assert client.get(f"/api/files/{fid}/download").status_code == 403
    client.post("/api/campaigns/join", json={"code": camp["invite_code"]})
    assert client.get(f"/api/files/{fid}/download").status_code == 200
    assert image_upload(client, "campaigns", camp["id"]).status_code == 403
    assert client.delete(f"/api/images/campaigns/{camp['id']}").status_code == 403
    client.cookies.clear(); client.cookies.update(owner)
    assert client.delete(f"/api/images/campaigns/{camp['id']}").status_code == 200
    assert client.get(f"/api/files/{fid}/download").status_code == 404

def test_replacing_cover_invalidates_old_image(client, image_storage):
    account(client)
    camp = campaign(client)
    first = image_upload(client, "campaigns", camp["id"]).json()["cover_file_id"]
    second = image_upload(client, "campaigns", camp["id"]).json()["cover_file_id"]
    assert first != second
    assert client.get(f"/api/files/{first}/download").status_code == 404
    assert client.get(f"/api/files/{second}/download").status_code == 200

def test_template_cover_access_and_independent_install(client, image_storage):
    _, author = account(client)
    tpl = client.post("/api/templates", json={"name":"Livro","system":"custom","is_public":True}).json()
    image = image_upload(client,"templates",tpl["id"])
    assert image.status_code == 200, image.text
    fid = image.json()["cover_file_id"]
    account(client,"reader@example.com")
    assert client.get(f"/api/files/{fid}/download").status_code == 200
    assert image_upload(client,"templates",tpl["id"]).status_code == 403
    installed = client.post(f"/api/templates/{tpl['id']}/install").json()
    clone_fid = installed["cover_file_id"]
    assert clone_fid != fid
    _, reader = account(client,"third@example.com")
    assert client.get(f"/api/files/{clone_fid}/download").status_code == 403
    client.cookies.clear(); client.cookies.update(author)
    client.patch(f"/api/templates/{tpl['id']}",json={"is_public":False})
    client.delete(f"/api/images/templates/{tpl['id']}")
    client.post("/api/auth/login",json={"email":"reader@example.com","password":"StrongPassword123"})
    assert client.get(f"/api/files/{fid}/download").status_code == 404
    assert client.get(f"/api/files/{clone_fid}/download").content == PNG

@pytest.mark.parametrize("kind", ["npc", "monster"])
def test_npc_portraits_require_master_and_campaign_access(client, image_storage, kind):
    _, owner = account(client)
    camp = campaign(client)
    npc = client.post("/api/npcs",json={"name":"Criatura","kind":kind,"campaign_id":camp["id"]}).json()
    portrait = image_upload(client,"npcs",npc["id"])
    assert portrait.status_code == 200, portrait.text
    fid = portrait.json()["avatar_file_id"]
    account(client,"player@example.com","player")
    assert client.get(f"/api/files/{fid}/download").status_code == 403
    client.post("/api/campaigns/join",json={"code":camp["invite_code"]})
    assert client.get(f"/api/files/{fid}/download").status_code == 200
    assert image_upload(client,"npcs",npc["id"]).status_code == 403
    client.cookies.clear(); client.cookies.update(owner)
    client.delete(f"/api/npcs/{npc['id']}")
    assert client.get(f"/api/files/{fid}/download").status_code == 404

def test_cover_must_be_image_and_cannot_be_injected_in_patch(client, image_storage):
    account(client)
    camp=campaign(client)
    assert image_upload(client,"campaigns",camp["id"],b"%PDF-1.0","doc.pdf","application/pdf").status_code == 415
    assert image_upload(client,"campaigns",camp["id"],b"<script>","fake.png","image/png").status_code == 415
    updated=client.patch(f"/api/campaigns/{camp['id']}",json={"cover_file_id":"stolen"}).json()
    assert not updated.get("cover_file_id")
    assert image_upload(client,"users","some-user").status_code == 404

def test_large_image_request_uses_upload_limit_not_json_limit(client, image_storage):
    account(client)
    camp=campaign(client)
    response=image_upload(client,"campaigns",camp["id"],PNG+b"x"*(3*1024*1024))
    assert response.status_code == 200, response.text
    assert image_upload(client,"campaigns",camp["id"],PNG+b"x"*(10*1024*1024)).status_code == 413
