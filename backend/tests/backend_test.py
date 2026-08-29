"""Backend tests for Grimorio RPG: Loot distribution + Campaign template seeding."""
import os
import time
import uuid

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"


def new_session(role="master", name=None):
    """Register a fresh user and return an authenticated session."""
    s = requests.Session()
    email = f"TEST_{role}_{uuid.uuid4().hex[:8]}@qatest.com"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234",
        "name": name or f"TEST {role}", "role": role})
    assert r.status_code == 200, f"register failed {r.status_code} {r.text[:300]}"
    return s, email


@pytest.fixture(scope="module")
def master():
    s, email = new_session("master", "TEST Mestre")
    return s


@pytest.fixture(scope="module")
def player():
    s, email = new_session("player", "TEST Jogador")
    return s


@pytest.fixture(scope="module")
def campaign(master, player):
    r = master.post(f"{API}/campaigns", json={"name": "TEST_Camp_Loot", "system": "dnd5e"})
    assert r.status_code == 200, r.text[:300]
    camp = r.json()
    # player joins
    rj = player.post(f"{API}/campaigns/join", json={"code": camp["invite_code"]})
    assert rj.status_code == 200, rj.text[:300]
    return camp


# ---------- Health / Auth basics ----------
class TestHealth:
    def test_seeded_admin_login(self):
        s = requests.Session()
        # Seeded admin email comes from backend ADMIN_EMAIL env (see /app/memory/test_credentials.md)
        backend_env = dotenv_values("/app/backend/.env")
        admin_email = backend_env.get("ADMIN_EMAIL", "admin@rpg.example.com")
        admin_password = backend_env.get("ADMIN_PASSWORD", "admin123")
        r = s.post(f"{API}/auth/login", json={"email": admin_email, "password": admin_password})
        assert r.status_code == 200, r.text[:300]
        me = s.get(f"{API}/auth/me")
        assert me.status_code == 200
        assert me.json()["role"] == "master"
        assert "access_token" in s.cookies.get_dict()


# ---------- Loot ----------
class TestLoot:
    def test_master_distributes_loot(self, master, player, campaign):
        # master creates a character in campaign
        rc = master.post(f"{API}/characters", json={
            "name": "TEST_Heroi", "campaign_id": campaign["id"],
            "coins": {"gp": 10, "sp": 0, "cp": 0, "pp": 0, "ep": 0}})
        assert rc.status_code == 200, rc.text[:300]
        char = rc.json()
        assert char["coins"]["gp"] == 10

        r = master.post(f"{API}/loot", json={
            "campaign_id": campaign["id"], "character_ids": [char["id"]],
            "items": [{"name": "Espada Longa", "qty": 2, "weight": 1.5, "category": "arma"}],
            "coins": {"gp": 50, "sp": 5}, "note": "Tesouro do dragao"})
        assert r.status_code == 200, r.text[:300]
        data = r.json()
        assert data["ok"] is True
        assert data["updated"] == [char["id"]]
        assert data["loot"]["campaign_id"] == campaign["id"]
        assert "_id" not in data["loot"]

        # verify persistence on character
        gc = master.get(f"{API}/characters/{char['id']}")
        assert gc.status_code == 200
        cd = gc.json()
        assert cd["coins"]["gp"] == 60, f"expected 60 got {cd['coins']}"
        assert cd["coins"]["sp"] == 5
        names = [i["name"] for i in cd["inventory"]]
        assert "Espada Longa" in names
        it = [i for i in cd["inventory"] if i["name"] == "Espada Longa"][0]
        assert it["qty"] == 2 and it["equipped"] is False

        # second distribution increments again
        r2 = master.post(f"{API}/loot", json={
            "campaign_id": campaign["id"], "character_ids": [char["id"]],
            "coins": {"gp": 5}})
        assert r2.status_code == 200
        cd2 = master.get(f"{API}/characters/{char['id']}").json()
        assert cd2["coins"]["gp"] == 65

    def test_notification_created_for_owner(self, master, player, campaign):
        # player creates own character
        rc = player.post(f"{API}/characters", json={
            "name": "TEST_PlayerChar", "campaign_id": campaign["id"]})
        assert rc.status_code == 200, rc.text[:300]
        pchar = rc.json()
        r = master.post(f"{API}/loot", json={
            "campaign_id": campaign["id"], "character_ids": [pchar["id"]],
            "items": [{"name": "Poção", "qty": 1}], "coins": {"gp": 3}, "note": "para voce"})
        assert r.status_code == 200, r.text[:300]
        time.sleep(0.5)
        notif = player.get(f"{API}/notifications")
        assert notif.status_code == 200
        loots = [n for n in notif.json() if n.get("type") == "loot"]
        assert loots, f"no loot notification found: {notif.json()}"
        assert "TEST_PlayerChar" in loots[0]["message"]
        assert "_id" not in loots[0]

    def test_player_cannot_distribute(self, player, campaign):
        r = player.post(f"{API}/loot", json={
            "campaign_id": campaign["id"], "character_ids": [], "coins": {"gp": 1}})
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text[:200]}"

    def test_empty_character_ids_returns_400(self, master, campaign):
        r = master.post(f"{API}/loot", json={
            "campaign_id": campaign["id"], "character_ids": [], "coins": {"gp": 1}})
        assert r.status_code == 400, f"expected 400 got {r.status_code} {r.text[:200]}"
        assert "personagem" in r.json()["detail"].lower()

    def test_get_loot_master_and_player(self, master, player, campaign):
        rm = master.get(f"{API}/loot", params={"campaign_id": campaign["id"]})
        assert rm.status_code == 200, rm.text[:300]
        assert isinstance(rm.json(), list) and len(rm.json()) >= 1
        assert all("_id" not in x for x in rm.json())
        rp = player.get(f"{API}/loot", params={"campaign_id": campaign["id"]})
        assert rp.status_code == 200, rp.text[:300]
        assert len(rp.json()) == len(rm.json())

    def test_outsider_cannot_read_loot(self, campaign):
        s, _ = new_session("master", "TEST Outsider")
        r = s.get(f"{API}/loot", params={"campaign_id": campaign["id"]})
        assert r.status_code in (403, 404), f"got {r.status_code}"

    def test_loot_unauthenticated(self, campaign):
        r = requests.get(f"{API}/loot", params={"campaign_id": campaign["id"]})
        assert r.status_code == 401


# ---------- Templates + character seeding ----------
class TestTemplateSeeding:
    def test_install_and_seed_character(self):
        master_a, _ = new_session("master", "TEST MasterA")
        master_b, _ = new_session("master", "TEST MasterB")

        rt = master_a.post(f"{API}/templates", json={
            "name": "TEST_Modelo_Publico", "system": "custom", "is_public": True,
            "attributes_schema": [{"key": "poder", "label": "Poder"},
                                  {"key": "agilidade", "label": "Agilidade"}],
            "skills_schema": [{"key": "furtividade", "label": "Furtividade"}]})
        assert rt.status_code == 200, rt.text[:300]
        tpl = rt.json()
        assert "_id" not in tpl

        # public listing includes it
        pub = master_b.get(f"{API}/templates", params={"scope": "public"})
        assert pub.status_code == 200
        assert any(t["id"] == tpl["id"] for t in pub.json())

        # install
        ri = master_b.post(f"{API}/templates/{tpl['id']}/install")
        assert ri.status_code == 200, ri.text[:300]
        cloned = ri.json()
        assert cloned["id"] != tpl["id"]
        assert cloned["cloned_from"] == tpl["id"]
        assert cloned["is_public"] is False
        assert "_id" not in cloned

        mine = master_b.get(f"{API}/templates", params={"scope": "mine"})
        assert mine.status_code == 200
        assert any(t["id"] == cloned["id"] for t in mine.json()), "installed template not in scope=mine"

        # create campaign with template
        rc = master_b.post(f"{API}/campaigns", json={
            "name": "TEST_Camp_Template", "system": "custom", "template_id": cloned["id"]})
        assert rc.status_code == 200, rc.text[:300]
        camp = rc.json()
        assert camp["template_id"] == cloned["id"]

        # create character in campaign -> seeded
        rch = master_b.post(f"{API}/characters", json={
            "name": "TEST_Seeded", "campaign_id": camp["id"]})
        assert rch.status_code == 200, rch.text[:300]
        ch = rch.json()
        assert ch["template_id"] == cloned["id"]
        assert ch["attributes"] == {"poder": 10, "agilidade": 10}, ch["attributes"]
        assert len(ch["skills"]) == 1
        assert ch["skills"][0]["name"] == "Furtividade"
        assert ch["skills"][0]["value"] == 0 and ch["skills"][0]["bonus"] == 0
        assert ch["system"] == "custom"

        # persisted
        got = master_b.get(f"{API}/characters/{ch['id']}").json()
        assert got["attributes"] == {"poder": 10, "agilidade": 10}
        assert got["template_id"] == cloned["id"]

        # invited player also gets seeding
        player_s, _ = new_session("player", "TEST SeedPlayer")
        rj = player_s.post(f"{API}/campaigns/join", json={"code": camp["invite_code"]})
        assert rj.status_code == 200, rj.text[:300]
        rp = player_s.post(f"{API}/characters", json={
            "name": "TEST_SeededPlayer", "campaign_id": camp["id"]})
        assert rp.status_code == 200, rp.text[:300]
        assert rp.json()["attributes"] == {"poder": 10, "agilidade": 10}

    def test_no_template_gets_default_dnd_attrs(self, master, campaign):
        r = master.post(f"{API}/characters", json={
            "name": "TEST_Default", "campaign_id": campaign["id"]})
        assert r.status_code == 200, r.text[:300]
        attrs = r.json()["attributes"]
        assert set(attrs.keys()) == {"str", "dex", "con", "int", "wis", "cha"}, attrs
        assert all(v == 10 for v in attrs.values())
        assert r.json().get("template_id") is None

    def test_player_cannot_create_template(self, player):
        r = player.post(f"{API}/templates", json={"name": "TEST_x", "system": "custom"})
        assert r.status_code == 403
