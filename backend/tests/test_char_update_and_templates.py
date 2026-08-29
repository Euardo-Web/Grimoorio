"""Backend tests: (1) PUT /api/characters/{id} history conflict fix, (2) template-driven attributes."""
import os
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

ATTR_SCHEMA = [
    {"key": "poder", "label": "Poder"},
    {"key": "destreza", "label": "Destreza"},
    {"key": "sabedoria", "label": "Sabedoria"},
]


def new_session(role="master", name=None):
    s = requests.Session()
    email = f"TEST_{role}_{uuid.uuid4().hex[:8]}@qatest.com"
    r = s.post(f"{API}/auth/register", json={
        "email": email, "password": "test1234",
        "name": name or f"TEST {role}", "role": role})
    assert r.status_code == 200, f"register failed {r.status_code} {r.text[:300]}"
    return s, email


@pytest.fixture(scope="module")
def env():
    """Master A owns a public template; Master B installs it, creates campaign; player joins."""
    ma, ma_email = new_session("master", "TEST MestreA")
    mb, mb_email = new_session("master", "TEST MestreB")
    player, p_email = new_session("player", "TEST Jogador")

    # public template with custom attributes
    r = ma.post(f"{API}/templates", json={
        "name": f"TEST_Tpl_{uuid.uuid4().hex[:6]}", "system": "custom",
        "description": "QA template", "is_public": True,
        "attributes_schema": ATTR_SCHEMA,
        "skills_schema": [{"key": "furtividade", "label": "Furtividade"}],
    })
    assert r.status_code == 200, r.text[:300]
    tpl_public = r.json()

    # Master B installs it (becomes private clone owned by B)
    r = mb.post(f"{API}/templates/{tpl_public['id']}/install")
    assert r.status_code == 200, r.text[:300]
    tpl = r.json()
    assert tpl["is_public"] is False
    assert tpl["attributes_schema"] == ATTR_SCHEMA

    # Campaign with template
    r = mb.post(f"{API}/campaigns", json={
        "name": f"TEST_Camp_{uuid.uuid4().hex[:6]}", "system": "custom",
        "template_id": tpl["id"]})
    assert r.status_code == 200, r.text[:300]
    camp = r.json()

    # player joins
    r = player.post(f"{API}/campaigns/join", json={"code": camp["invite_code"]})
    assert r.status_code == 200, r.text[:300]

    # character created by player in campaign
    r = player.post(f"{API}/characters", json={"name": "TEST_Heroi", "campaign_id": camp["id"]})
    assert r.status_code == 200, r.text[:300]
    char = r.json()

    data = {"ma": ma, "mb": mb, "player": player, "tpl_public": tpl_public,
            "tpl": tpl, "camp": camp, "char": char}
    yield data
    player.delete(f"{API}/characters/{char['id']}")
    mb.delete(f"{API}/campaigns/{camp['id']}")
    mb.delete(f"{API}/templates/{tpl['id']}")
    ma.delete(f"{API}/templates/{tpl_public['id']}")


class TestTemplateDrivenAttributes:
    def test_character_seeded_with_template_attributes(self, env):
        c = env["char"]
        assert c["template_id"] == env["tpl"]["id"]
        assert c["attributes"] == {"poder": 10, "destreza": 10, "sabedoria": 10}
        for legacy in ("str", "dex", "con", "int", "wis", "cha"):
            assert legacy not in c["attributes"]
        # skills seeded from template
        assert any(s["name"] == "Furtividade" for s in c["skills"]), c["skills"]

    def test_get_character_persists_template_attributes(self, env):
        r = env["player"].get(f"{API}/characters/{env['char']['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["attributes"] == {"poder": 10, "destreza": 10, "sabedoria": 10}
        assert d["template_id"] == env["tpl"]["id"]
        assert "_id" not in d

    def test_player_member_can_read_private_template(self, env):
        r = env["player"].get(f"{API}/templates/{env['tpl']['id']}")
        assert r.status_code == 200, f"{r.status_code} {r.text[:300]}"
        t = r.json()
        assert t["is_public"] is False
        assert t["attributes_schema"] == ATTR_SCHEMA
        assert "_id" not in t

    def test_master_author_can_read_own_private_template(self, env):
        r = env["mb"].get(f"{API}/templates/{env['tpl']['id']}")
        assert r.status_code == 200
        assert r.json()["id"] == env["tpl"]["id"]

    def test_non_member_cannot_read_private_template(self, env):
        outsider, _ = new_session("player", "TEST Outsider")
        r = outsider.get(f"{API}/templates/{env['tpl']['id']}")
        assert r.status_code == 403, f"expected 403 got {r.status_code} {r.text[:300]}"

    def test_template_404_for_unknown_id(self, env):
        r = env["player"].get(f"{API}/templates/{uuid.uuid4().hex}")
        assert r.status_code == 404


class TestCharacterUpdateHistoryFix:
    def test_put_with_full_body_including_history(self, env):
        cid = env["char"]["id"]
        s = env["player"]
        full = s.get(f"{API}/characters/{cid}").json()
        assert "history" in full and isinstance(full["history"], list)
        before = len(full["history"])

        payload = {**full,
                   "attributes": {"poder": 15, "destreza": 12, "sabedoria": 8},
                   "hp_current": 7, "hp_max": 22,
                   "skills": [{"name": "Furtividade", "value": 3, "bonus": 1}],
                   "spells": [{"name": "Bola de Fogo", "level": 3, "prepared": True}],
                   "inventory": [{"name": "Espada", "qty": 1, "weight": 3.0,
                                  "category": "weapon", "equipped": True}]}
        r = s.put(f"{API}/characters/{cid}", json=payload)
        assert r.status_code == 200, f"PUT failed {r.status_code} {r.text[:500]}"
        d = r.json()
        assert d["attributes"] == {"poder": 15, "destreza": 12, "sabedoria": 8}
        assert d["hp_current"] == 7 and d["hp_max"] == 22
        assert d["skills"][0]["value"] == 3
        assert d["spells"][0]["name"] == "Bola de Fogo"
        assert d["inventory"][0]["name"] == "Espada"
        assert "_id" not in d
        # history preserved + exactly one appended
        assert len(d["history"]) == before + 1
        assert d["history"][0]["action"] == "created"
        assert d["history"][-1]["action"] == "updated"

    def test_persistence_via_get(self, env):
        r = env["player"].get(f"{API}/characters/{env['char']['id']}")
        assert r.status_code == 200
        d = r.json()
        assert d["attributes"]["poder"] == 15
        assert d["hp_current"] == 7

    def test_master_sees_updated_values(self, env):
        r = env["mb"].get(f"{API}/characters/{env['char']['id']}")
        assert r.status_code == 200, r.text[:300]
        d = r.json()
        assert d["attributes"] == {"poder": 15, "destreza": 12, "sabedoria": 8}
        assert d["hp_max"] == 22

    def test_repeated_puts_append_one_history_each(self, env):
        cid = env["char"]["id"]
        s = env["player"]
        base = s.get(f"{API}/characters/{cid}").json()
        start = len(base["history"])
        for i in range(3):
            body = s.get(f"{API}/characters/{cid}").json()
            body["notes"] = f"nota {i}"
            r = s.put(f"{API}/characters/{cid}", json=body)
            assert r.status_code == 200, f"iteration {i}: {r.status_code} {r.text[:300]}"
            assert len(r.json()["history"]) == start + i + 1
        final = s.get(f"{API}/characters/{cid}").json()
        assert final["notes"] == "nota 2"
        assert len(final["history"]) == start + 3

    def test_put_with_mongo_id_field_does_not_break(self, env):
        cid = env["char"]["id"]
        s = env["player"]
        body = s.get(f"{API}/characters/{cid}").json()
        body["_id"] = "should-be-ignored"
        body["owner_id"] = "hacker"
        body["id"] = "other-id"
        body["level"] = 5
        r = s.put(f"{API}/characters/{cid}", json=body)
        assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
        d = r.json()
        assert d["id"] == cid
        assert d["level"] == 5
        assert d["owner_id"] != "hacker"

    def test_master_cannot_edit_player_character(self, env):
        r = env["mb"].put(f"{API}/characters/{env['char']['id']}", json={"level": 9})
        assert r.status_code == 403, f"expected 403 got {r.status_code}"

    def test_put_unknown_character_404(self, env):
        r = env["player"].put(f"{API}/characters/{uuid.uuid4().hex}", json={"level": 2})
        assert r.status_code == 404


class TestDefaultDndCharacter:
    def test_character_without_template_gets_dnd_defaults(self, env):
        s = env["player"]
        r = s.post(f"{API}/characters", json={"name": "TEST_SemModelo"})
        assert r.status_code == 200, r.text[:300]
        c = r.json()
        try:
            assert c["attributes"] == {"str": 10, "dex": 10, "con": 10,
                                      "int": 10, "wis": 10, "cha": 10}
            assert not c.get("template_id")
            body = s.get(f"{API}/characters/{c['id']}").json()
            body["attributes"]["str"] = 18
            r = s.put(f"{API}/characters/{c['id']}", json=body)
            assert r.status_code == 200, r.text[:300]
            assert r.json()["attributes"]["str"] == 18
        finally:
            s.delete(f"{API}/characters/{c['id']}")
