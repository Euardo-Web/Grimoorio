from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import uuid
import logging
import secrets
import string
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, Request, Response, HTTPException, Depends, UploadFile, File, Form, Query, Header
from fastapi.responses import Response as FastResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# --------- Setup ---------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="RPG Manager")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("rpg")

JWT_ALGO = "HS256"
def jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

# --------- Storage (Emergent Object Storage) ---------
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
APP_NAME = os.environ.get("APP_NAME", "rpgmanager")
_storage_key: Optional[str] = None

def init_storage(force: bool = False):
    global _storage_key
    if _storage_key and not force:
        return _storage_key
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        return _storage_key
    except Exception as e:
        logger.error(f"Storage init failed: {e}")
        return None

def put_object(path: str, data: bytes, content_type: str) -> dict:
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    r = requests.put(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key, "Content-Type": content_type},
                     data=data, timeout=120)
    if r.status_code == 404:
        init_storage(force=True)
        key = _storage_key
        r = requests.put(f"{STORAGE_URL}/objects/{path}",
                         headers={"X-Storage-Key": key, "Content-Type": content_type},
                         data=data, timeout=120)
    r.raise_for_status()
    return r.json()

def get_object(path: str):
    key = init_storage()
    if not key:
        raise HTTPException(status_code=500, detail="Storage not initialized")
    r = requests.get(f"{STORAGE_URL}/objects/{path}",
                     headers={"X-Storage-Key": key}, timeout=60)
    if r.status_code == 404:
        raise HTTPException(status_code=404, detail="File not found")
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

# --------- Password / Token helpers ---------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_access_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "type": "access",
               "exp": datetime.now(timezone.utc) + timedelta(hours=6)}
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)

def create_refresh_token(uid: str) -> str:
    payload = {"sub": uid, "type": "refresh",
               "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGO)

def set_auth_cookies(resp: Response, access: str, refresh: str):
    resp.set_cookie("access_token", access, httponly=True, secure=True, samesite="none",
                    max_age=6*3600, path="/")
    resp.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none",
                    max_age=7*24*3600, path="/")

# --------- Auth dependency ---------
async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --------- Helpers ---------
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def new_id() -> str:
    return str(uuid.uuid4())

def invite_code() -> str:
    return "".join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(6))

def strip_id(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    doc.pop("_id", None)
    return doc

# --------- Pydantic Models ---------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "player"  # player | master

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class CampaignIn(BaseModel):
    name: str
    system: str = "dnd5e"  # dnd5e | tormenta | custom
    description: str = ""
    template_id: Optional[str] = None

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    system: Optional[str] = None
    description: Optional[str] = None
    template_id: Optional[str] = None

class JoinIn(BaseModel):
    code: str

class CharacterIn(BaseModel):
    name: str
    campaign_id: Optional[str] = None
    system: str = "dnd5e"
    avatar_url: Optional[str] = None
    class_name: str = ""
    race: str = ""
    level: int = 1
    background_text: str = ""
    attributes: Dict[str, int] = Field(default_factory=dict)
    skills: List[Dict[str, Any]] = Field(default_factory=list)
    hp_current: int = 10
    hp_max: int = 10
    hp_temp: int = 0
    armor_class: int = 10
    initiative: int = 0
    conditions: List[str] = Field(default_factory=list)
    spells: List[Dict[str, Any]] = Field(default_factory=list)
    spell_slots: Dict[str, Dict[str, int]] = Field(default_factory=dict)  # {"1": {"max": 4, "current": 4}}
    inventory: List[Dict[str, Any]] = Field(default_factory=list)
    coins: Dict[str, int] = Field(default_factory=lambda: {"gp": 0, "sp": 0, "cp": 0, "pp": 0, "ep": 0})
    notes: str = ""

class DiceRollIn(BaseModel):
    campaign_id: Optional[str] = None
    character_id: Optional[str] = None
    expression: str  # e.g. "1d20+5"
    label: str = ""

class SessionNoteIn(BaseModel):
    campaign_id: str
    title: str
    content: str
    session_number: Optional[int] = None

class NPCIn(BaseModel):
    campaign_id: str
    name: str
    kind: str = "npc"  # npc | monster
    description: str = ""
    stats: Dict[str, Any] = Field(default_factory=dict)
    avatar_url: Optional[str] = None

class TemplateIn(BaseModel):
    name: str
    system: str
    description: str = ""
    is_public: bool = False
    attributes_schema: List[Dict[str, Any]] = Field(default_factory=list)  # [{key, label}]
    skills_schema: List[Dict[str, Any]] = Field(default_factory=list)
    sections: List[Dict[str, Any]] = Field(default_factory=list)

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    system: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    attributes_schema: Optional[List[Dict[str, Any]]] = None
    skills_schema: Optional[List[Dict[str, Any]]] = None
    sections: Optional[List[Dict[str, Any]]] = None

class LootIn(BaseModel):
    campaign_id: str
    character_ids: List[str]
    items: List[Dict[str, Any]] = Field(default_factory=list)  # [{name, qty, weight, category}]
    coins: Dict[str, int] = Field(default_factory=dict)
    note: str = ""

# --------- Auth endpoints ---------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    if body.role not in ("player", "master"):
        raise HTTPException(status_code=400, detail="Role inválido")
    uid = new_id()
    doc = {
        "id": uid, "email": email, "name": body.name.strip(),
        "role": body.role, "password_hash": hash_password(body.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    access = create_access_token(uid, email)
    refresh = create_refresh_token(uid)
    set_auth_cookies(response, access, refresh)
    return {"id": uid, "email": email, "name": doc["name"], "role": doc["role"]}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}

@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, jwt_secret(), algorithms=[JWT_ALGO])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True,
                            samesite="none", max_age=6*3600, path="/")
        return {"ok": True}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# --------- Campaigns ---------
async def get_campaign_or_403(cid: str, user: dict, require_master: bool = False) -> dict:
    camp = await db.campaigns.find_one({"id": cid})
    if not camp:
        raise HTTPException(status_code=404, detail="Campanha não encontrada")
    strip_id(camp)
    is_master = camp["master_id"] == user["id"]
    is_player = user["id"] in camp.get("player_ids", [])
    if require_master and not is_master:
        raise HTTPException(status_code=403, detail="Apenas o mestre pode fazer isso")
    if not (is_master or is_player):
        raise HTTPException(status_code=403, detail="Sem acesso à campanha")
    return camp

@api.post("/campaigns")
async def create_campaign(body: CampaignIn, user=Depends(get_current_user)):
    if user["role"] != "master":
        raise HTTPException(status_code=403, detail="Apenas mestres podem criar campanhas")
    cid = new_id()
    code = invite_code()
    while await db.campaigns.find_one({"invite_code": code}):
        code = invite_code()
    doc = {
        "id": cid, "name": body.name, "system": body.system,
        "description": body.description, "master_id": user["id"],
        "invite_code": code, "player_ids": [], "template_id": body.template_id,
        "created_at": now_iso(),
    }
    await db.campaigns.insert_one(doc)
    strip_id(doc)
    return doc

@api.get("/campaigns")
async def list_campaigns(user=Depends(get_current_user)):
    cursor = db.campaigns.find({"$or": [{"master_id": user["id"]}, {"player_ids": user["id"]}]})
    result = []
    async for c in cursor:
        strip_id(c)
        c["is_master"] = c["master_id"] == user["id"]
        result.append(c)
    return result

@api.get("/campaigns/{cid}")
async def get_campaign(cid: str, user=Depends(get_current_user)):
    camp = await get_campaign_or_403(cid, user)
    # Fetch players
    players = []
    async for p in db.users.find({"id": {"$in": camp.get("player_ids", []) + [camp["master_id"]]}}):
        players.append({"id": p["id"], "name": p["name"], "email": p["email"],
                        "role": "master" if p["id"] == camp["master_id"] else "player"})
    camp["members"] = players
    camp["is_master"] = camp["master_id"] == user["id"]
    return camp

@api.patch("/campaigns/{cid}")
async def update_campaign(cid: str, body: CampaignUpdate, user=Depends(get_current_user)):
    await get_campaign_or_403(cid, user, require_master=True)
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.campaigns.update_one({"id": cid}, {"$set": updates})
        # Notify players when template changes
        if "template_id" in updates:
            camp = await db.campaigns.find_one({"id": cid})
            for pid in camp.get("player_ids", []):
                await db.notifications.insert_one({
                    "id": new_id(), "user_id": pid, "type": "template_updated",
                    "message": f"O mestre atualizou o modelo de ficha em '{camp['name']}'",
                    "created_at": now_iso(), "read": False,
                })
    doc = await db.campaigns.find_one({"id": cid})
    return strip_id(doc)

@api.delete("/campaigns/{cid}")
async def delete_campaign(cid: str, user=Depends(get_current_user)):
    await get_campaign_or_403(cid, user, require_master=True)
    await db.campaigns.delete_one({"id": cid})
    return {"ok": True}

@api.post("/campaigns/join")
async def join_campaign(body: JoinIn, user=Depends(get_current_user)):
    code = body.code.upper().strip()
    camp = await db.campaigns.find_one({"invite_code": code})
    if not camp:
        raise HTTPException(status_code=404, detail="Código inválido")
    if user["id"] == camp["master_id"]:
        raise HTTPException(status_code=400, detail="Você é o mestre desta campanha")
    if user["id"] in camp.get("player_ids", []):
        return strip_id(camp)
    await db.campaigns.update_one({"id": camp["id"]}, {"$push": {"player_ids": user["id"]}})
    camp = await db.campaigns.find_one({"id": camp["id"]})
    return strip_id(camp)

# --------- Characters ---------
def default_dnd_char(name: str) -> dict:
    return {
        "attributes": {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
        "skills": [],
        "spell_slots": {str(i): {"max": 0, "current": 0} for i in range(1, 10)},
    }

@api.post("/characters")
async def create_character(body: CharacterIn, user=Depends(get_current_user)):
    template = None
    if body.campaign_id:
        camp = await get_campaign_or_403(body.campaign_id, user)
        if camp.get("template_id"):
            template = await db.templates.find_one({"id": camp["template_id"]})
    cid = new_id()
    data = body.model_dump()
    # Seed from campaign template if present
    if template:
        if not data["attributes"] and template.get("attributes_schema"):
            data["attributes"] = {a["key"]: 10 for a in template["attributes_schema"] if a.get("key")}
        if not data["skills"] and template.get("skills_schema"):
            data["skills"] = [{"name": s.get("label") or s.get("key"), "value": 0, "bonus": 0}
                              for s in template["skills_schema"] if s.get("key") or s.get("label")]
        data["template_id"] = template["id"]
        data["system"] = template.get("system", data.get("system", "custom"))
    if not data["attributes"]:
        data["attributes"] = {"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10}
    if not data["spell_slots"]:
        data["spell_slots"] = {str(i): {"max": 0, "current": 0} for i in range(1, 10)}
    doc = {**data, "id": cid, "owner_id": user["id"],
           "created_at": now_iso(), "updated_at": now_iso(),
           "history": [{"at": now_iso(), "action": "created"}]}
    await db.characters.insert_one(doc)
    return strip_id(doc)

@api.get("/characters")
async def list_characters(campaign_id: Optional[str] = None, user=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if campaign_id:
        await get_campaign_or_403(campaign_id, user)
        q["campaign_id"] = campaign_id
    else:
        q["owner_id"] = user["id"]
    result = []
    async for c in db.characters.find(q):
        strip_id(c)
        result.append(c)
    return result

@api.get("/characters/{char_id}")
async def get_character(char_id: str, user=Depends(get_current_user)):
    c = await db.characters.find_one({"id": char_id})
    if not c:
        raise HTTPException(status_code=404, detail="Personagem não encontrado")
    strip_id(c)
    # Access: owner or campaign master/player
    if c["owner_id"] != user["id"]:
        if c.get("campaign_id"):
            await get_campaign_or_403(c["campaign_id"], user)
        else:
            raise HTTPException(status_code=403, detail="Sem acesso")
    return c

@api.put("/characters/{char_id}")
async def update_character(char_id: str, body: dict, user=Depends(get_current_user)):
    c = await db.characters.find_one({"id": char_id})
    if not c:
        raise HTTPException(status_code=404, detail="Personagem não encontrado")
    if c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Apenas o dono pode editar")
    # Strip fields that must not be overwritten or that would conflict with $push history
    for k in ("id", "_id", "owner_id", "created_at", "history"):
        body.pop(k, None)
    body["updated_at"] = now_iso()
    await db.characters.update_one({"id": char_id},
        {"$set": body, "$push": {"history": {"at": now_iso(), "action": "updated"}}})
    doc = await db.characters.find_one({"id": char_id})
    return strip_id(doc)

@api.delete("/characters/{char_id}")
async def delete_character(char_id: str, user=Depends(get_current_user)):
    c = await db.characters.find_one({"id": char_id})
    if not c:
        raise HTTPException(status_code=404, detail="Personagem não encontrado")
    if c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    await db.characters.delete_one({"id": char_id})
    return {"ok": True}

@api.post("/characters/{char_id}/duplicate")
async def duplicate_character(char_id: str, user=Depends(get_current_user)):
    c = await db.characters.find_one({"id": char_id})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Não encontrado")
    strip_id(c)
    c["id"] = new_id()
    c["name"] = c["name"] + " (cópia)"
    c["created_at"] = now_iso(); c["updated_at"] = now_iso()
    c["history"] = [{"at": now_iso(), "action": "duplicated"}]
    await db.characters.insert_one(c)
    return strip_id(c)

@api.post("/characters/{char_id}/rest")
async def rest_character(char_id: str, kind: str = "long", user=Depends(get_current_user)):
    c = await db.characters.find_one({"id": char_id})
    if not c or c["owner_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Não encontrado")
    slots = c.get("spell_slots", {})
    if kind == "long":
        for k, v in slots.items():
            slots[k]["current"] = v.get("max", 0)
        hp_max = c.get("hp_max", 0)
        await db.characters.update_one({"id": char_id},
            {"$set": {"spell_slots": slots, "hp_current": hp_max, "hp_temp": 0}})
        # Notify
        await db.notifications.insert_one({
            "id": new_id(), "user_id": user["id"], "type": "rest",
            "message": f"Descanso longo: {c['name']} recuperou espaços de magia e HP.",
            "created_at": now_iso(), "read": False,
        })
    else:  # short: only recover half of level 1 as example — keep simple
        await db.notifications.insert_one({
            "id": new_id(), "user_id": user["id"], "type": "rest",
            "message": f"Descanso curto: {c['name']}.",
            "created_at": now_iso(), "read": False,
        })
    doc = await db.characters.find_one({"id": char_id})
    return strip_id(doc)

# --------- Dice Rolls ---------
import re
def roll_expression(expr: str) -> dict:
    """Parse and roll expression like 1d20+5, 2d6-1, d20."""
    expr = expr.replace(" ", "").lower()
    # split by + / -
    tokens = re.findall(r"([+-]?[^+-]+)", expr)
    total = 0
    breakdown = []
    for tk in tokens:
        if not tk:
            continue
        sign = 1
        if tk.startswith("-"):
            sign = -1; tk = tk[1:]
        elif tk.startswith("+"):
            tk = tk[1:]
        if "d" in tk:
            parts = tk.split("d")
            count = int(parts[0]) if parts[0] else 1
            faces = int(parts[1])
            rolls = [secrets.randbelow(faces) + 1 for _ in range(count)]
            subtotal = sum(rolls) * sign
            total += subtotal
            breakdown.append({"dice": f"{count}d{faces}", "rolls": rolls, "sign": sign})
        else:
            n = int(tk) * sign
            total += n
            breakdown.append({"modifier": n})
    return {"total": total, "breakdown": breakdown}

@api.post("/rolls")
async def create_roll(body: DiceRollIn, user=Depends(get_current_user)):
    if body.campaign_id:
        await get_campaign_or_403(body.campaign_id, user)
    try:
        result = roll_expression(body.expression)
    except Exception:
        raise HTTPException(status_code=400, detail="Expressão inválida (ex: 1d20+5)")
    doc = {
        "id": new_id(), "campaign_id": body.campaign_id, "character_id": body.character_id,
        "user_id": user["id"], "user_name": user["name"],
        "expression": body.expression, "label": body.label,
        "total": result["total"], "breakdown": result["breakdown"],
        "created_at": now_iso(),
    }
    await db.rolls.insert_one(doc)
    return strip_id(doc)

@api.get("/rolls")
async def list_rolls(campaign_id: Optional[str] = None, since: Optional[str] = None,
                     limit: int = 50, user=Depends(get_current_user)):
    q: Dict[str, Any] = {}
    if campaign_id:
        await get_campaign_or_403(campaign_id, user)
        q["campaign_id"] = campaign_id
    else:
        q["user_id"] = user["id"]
    if since:
        q["created_at"] = {"$gt": since}
    cursor = db.rolls.find(q).sort("created_at", -1).limit(limit)
    result = []
    async for r in cursor:
        strip_id(r)
        result.append(r)
    result.reverse()
    return result

# --------- Files ---------
@api.post("/files/upload")
async def upload_file(file: UploadFile = File(...),
                      campaign_id: Optional[str] = Form(None),
                      user=Depends(get_current_user)):
    if campaign_id:
        await get_campaign_or_403(campaign_id, user)
    ext = (file.filename.rsplit(".", 1)[-1] if "." in file.filename else "bin").lower()
    fid = new_id()
    path = f"{APP_NAME}/uploads/{user['id']}/{fid}.{ext}"
    data = await file.read()
    result = put_object(path, data, file.content_type or "application/octet-stream")
    rec = {
        "id": fid, "storage_path": result["path"], "original_filename": file.filename,
        "content_type": file.content_type, "size": result.get("size", len(data)),
        "user_id": user["id"], "campaign_id": campaign_id, "is_deleted": False,
        "created_at": now_iso(),
    }
    await db.files.insert_one(rec)
    strip_id(rec)
    rec["url"] = f"/api/files/{fid}/download"
    return rec

@api.get("/files")
async def list_files(campaign_id: Optional[str] = None, user=Depends(get_current_user)):
    q: Dict[str, Any] = {"is_deleted": False}
    if campaign_id:
        await get_campaign_or_403(campaign_id, user)
        q["campaign_id"] = campaign_id
    else:
        q["user_id"] = user["id"]
    result = []
    async for f in db.files.find(q).sort("created_at", -1):
        strip_id(f)
        f["url"] = f"/api/files/{f['id']}/download"
        result.append(f)
    return result

@api.get("/files/{fid}/download")
async def download_file(fid: str, request: Request, auth: Optional[str] = Query(None)):
    # Allow query param auth for img src
    if auth:
        try:
            payload = jwt.decode(auth, jwt_secret(), algorithms=[JWT_ALGO])
            user_id = payload.get("sub")
            if not user_id:
                raise HTTPException(status_code=401, detail="Invalid token")
        except jwt.PyJWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
    else:
        user = await get_current_user(request)
        user_id = user["id"]
    rec = await db.files.find_one({"id": fid, "is_deleted": False})
    if not rec:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    # Access: owner or campaign member
    if rec["user_id"] != user_id and rec.get("campaign_id"):
        camp = await db.campaigns.find_one({"id": rec["campaign_id"]})
        if not camp or (user_id != camp["master_id"] and user_id not in camp.get("player_ids", [])):
            raise HTTPException(status_code=403, detail="Sem acesso")
    data, ct = get_object(rec["storage_path"])
    return FastResponse(content=data, media_type=rec.get("content_type") or ct)

@api.delete("/files/{fid}")
async def delete_file(fid: str, user=Depends(get_current_user)):
    rec = await db.files.find_one({"id": fid})
    if not rec:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if rec["user_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Sem permissão")
    await db.files.update_one({"id": fid}, {"$set": {"is_deleted": True}})
    return {"ok": True}

# --------- Loot ---------
@api.post("/loot")
async def distribute_loot(body: LootIn, user=Depends(get_current_user)):
    camp = await get_campaign_or_403(body.campaign_id, user, require_master=True)
    if not body.character_ids:
        raise HTTPException(status_code=400, detail="Selecione ao menos um personagem")
    updated = []
    for char_id in body.character_ids:
        c = await db.characters.find_one({"id": char_id, "campaign_id": body.campaign_id})
        if not c:
            continue
        inv = c.get("inventory", []) or []
        for item in body.items:
            inv.append({
                "name": item.get("name", "Item"),
                "qty": int(item.get("qty", 1) or 1),
                "weight": float(item.get("weight", 0) or 0),
                "category": item.get("category", "misc"),
                "equipped": False,
            })
        coins = dict(c.get("coins") or {"gp": 0, "sp": 0, "cp": 0, "pp": 0, "ep": 0})
        for k, v in (body.coins or {}).items():
            coins[k] = int(coins.get(k, 0)) + int(v or 0)
        await db.characters.update_one(
            {"id": char_id},
            {"$set": {"inventory": inv, "coins": coins, "updated_at": now_iso()},
             "$push": {"history": {"at": now_iso(), "action": "loot_received", "note": body.note}}}
        )
        # Notify owner
        await db.notifications.insert_one({
            "id": new_id(), "user_id": c["owner_id"], "type": "loot",
            "message": f"{user['name']} enviou loot para {c['name']} em '{camp['name']}'.",
            "created_at": now_iso(), "read": False,
        })
        updated.append(char_id)
    # Log in loot history
    loot_doc = {
        "id": new_id(), "campaign_id": body.campaign_id, "master_id": user["id"],
        "master_name": user["name"], "character_ids": updated, "items": body.items,
        "coins": body.coins, "note": body.note, "created_at": now_iso(),
    }
    await db.loot_history.insert_one(loot_doc)
    return {"ok": True, "updated": updated, "loot": strip_id(loot_doc)}

@api.get("/loot")
async def list_loot(campaign_id: str, user=Depends(get_current_user)):
    await get_campaign_or_403(campaign_id, user)
    result = []
    async for l in db.loot_history.find({"campaign_id": campaign_id}).sort("created_at", -1).limit(50):
        strip_id(l); result.append(l)
    return result

# --------- Session Notes ---------
@api.post("/sessions")
async def create_session_note(body: SessionNoteIn, user=Depends(get_current_user)):
    await get_campaign_or_403(body.campaign_id, user, require_master=True)
    doc = {**body.model_dump(), "id": new_id(), "author_id": user["id"],
           "created_at": now_iso()}
    await db.sessions.insert_one(doc)
    return strip_id(doc)

@api.get("/sessions")
async def list_session_notes(campaign_id: str, user=Depends(get_current_user)):
    await get_campaign_or_403(campaign_id, user)
    result = []
    async for s in db.sessions.find({"campaign_id": campaign_id}).sort("created_at", -1):
        strip_id(s); result.append(s)
    return result

@api.delete("/sessions/{sid}")
async def delete_session(sid: str, user=Depends(get_current_user)):
    s = await db.sessions.find_one({"id": sid})
    if not s:
        raise HTTPException(status_code=404, detail="Não encontrado")
    await get_campaign_or_403(s["campaign_id"], user, require_master=True)
    await db.sessions.delete_one({"id": sid})
    return {"ok": True}

# --------- NPCs ---------
@api.post("/npcs")
async def create_npc(body: NPCIn, user=Depends(get_current_user)):
    await get_campaign_or_403(body.campaign_id, user, require_master=True)
    doc = {**body.model_dump(), "id": new_id(), "created_at": now_iso()}
    await db.npcs.insert_one(doc)
    return strip_id(doc)

@api.get("/npcs")
async def list_npcs(campaign_id: str, user=Depends(get_current_user)):
    await get_campaign_or_403(campaign_id, user)
    result = []
    async for n in db.npcs.find({"campaign_id": campaign_id}).sort("created_at", -1):
        strip_id(n); result.append(n)
    return result

@api.delete("/npcs/{nid}")
async def delete_npc(nid: str, user=Depends(get_current_user)):
    n = await db.npcs.find_one({"id": nid})
    if not n:
        raise HTTPException(status_code=404, detail="Não encontrado")
    await get_campaign_or_403(n["campaign_id"], user, require_master=True)
    await db.npcs.delete_one({"id": nid})
    return {"ok": True}

# --------- Templates (sheet templates + public library) ---------
@api.post("/templates")
async def create_template(body: TemplateIn, user=Depends(get_current_user)):
    if user["role"] != "master":
        raise HTTPException(status_code=403, detail="Apenas mestres")
    doc = {**body.model_dump(), "id": new_id(), "author_id": user["id"],
           "author_name": user["name"], "created_at": now_iso(),
           "installs": 0}
    await db.templates.insert_one(doc)
    return strip_id(doc)

@api.get("/templates")
async def list_templates(scope: str = "mine", user=Depends(get_current_user)):
    if scope == "public":
        q: Dict[str, Any] = {"is_public": True}
    else:
        q = {"author_id": user["id"]}
    result = []
    async for t in db.templates.find(q).sort("created_at", -1):
        strip_id(t); result.append(t)
    return result

@api.get("/templates/{tid}")
async def get_template(tid: str, user=Depends(get_current_user)):
    t = await db.templates.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Modelo não encontrado")
    strip_id(t)
    if t.get("is_public") or t["author_id"] == user["id"]:
        return t
    # Allow access if user is a member of any campaign that uses this template
    camp = await db.campaigns.find_one({
        "template_id": tid,
        "$or": [{"master_id": user["id"]}, {"player_ids": user["id"]}],
    })
    if camp:
        return t
    raise HTTPException(status_code=403, detail="Modelo privado")

@api.patch("/templates/{tid}")
async def update_template(tid: str, body: TemplateUpdate, user=Depends(get_current_user)):
    t = await db.templates.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if t["author_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Apenas o autor pode editar")
    updates = {k: v for k, v in body.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        await db.templates.update_one({"id": tid}, {"$set": updates})
    doc = await db.templates.find_one({"id": tid})
    return strip_id(doc)

@api.delete("/templates/{tid}")
async def delete_template(tid: str, user=Depends(get_current_user)):
    t = await db.templates.find_one({"id": tid})
    if not t or t["author_id"] != user["id"]:
        raise HTTPException(status_code=404, detail="Não encontrado")
    await db.templates.delete_one({"id": tid})
    return {"ok": True}

@api.post("/templates/{tid}/install")
async def install_template(tid: str, user=Depends(get_current_user)):
    """Clone a public template into your own list."""
    t = await db.templates.find_one({"id": tid})
    if not t:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if not t.get("is_public"):
        raise HTTPException(status_code=403, detail="Modelo privado")
    strip_id(t)
    t["id"] = new_id()
    t["author_id"] = user["id"]
    t["author_name"] = user["name"]
    t["is_public"] = False
    t["created_at"] = now_iso()
    t["installs"] = 0
    t["cloned_from"] = tid
    await db.templates.insert_one(t)
    await db.templates.update_one({"id": tid}, {"$inc": {"installs": 1}})
    return strip_id(t)

# --------- Notifications ---------
@api.get("/notifications")
async def list_notifications(user=Depends(get_current_user)):
    result = []
    async for n in db.notifications.find({"user_id": user["id"]}).sort("created_at", -1).limit(50):
        strip_id(n); result.append(n)
    return result

@api.post("/notifications/read-all")
async def read_all(user=Depends(get_current_user)):
    await db.notifications.update_many({"user_id": user["id"]}, {"$set": {"read": True}})
    return {"ok": True}

# --------- Export/Import ---------
@api.get("/characters/{char_id}/export")
async def export_character(char_id: str, user=Depends(get_current_user)):
    c = await db.characters.find_one({"id": char_id})
    if not c:
        raise HTTPException(status_code=404, detail="Não encontrado")
    strip_id(c)
    if c["owner_id"] != user["id"]:
        raise HTTPException(status_code=403, detail="Sem acesso")
    return c

@api.post("/characters/import")
async def import_character(data: dict, user=Depends(get_current_user)):
    data.pop("_id", None)
    data["id"] = new_id()
    data["owner_id"] = user["id"]
    data["created_at"] = now_iso(); data["updated_at"] = now_iso()
    data["history"] = [{"at": now_iso(), "action": "imported"}]
    await db.characters.insert_one(data)
    return strip_id(data)

# --------- Health ---------
@api.get("/")
async def root():
    return {"status": "ok", "app": "rpg-manager"}

# --------- Startup ---------
@app.on_event("startup")
async def startup():
    init_storage()
    await db.users.create_index("email", unique=True)
    await db.campaigns.create_index("invite_code", unique=True)
    await db.characters.create_index("owner_id")
    await db.rolls.create_index([("campaign_id", 1), ("created_at", -1)])
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@rpg.local")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": new_id(), "email": admin_email, "name": "Admin",
            "role": "master", "password_hash": hash_password(admin_password),
            "created_at": now_iso(),
        })
    logger.info("Startup complete")

@app.on_event("shutdown")
async def shutdown():
    client.close()

app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)
