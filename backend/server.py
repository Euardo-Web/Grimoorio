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

# --------- Storage (Cloudflare R2 - S3 compatible) ---------
import boto3
from botocore.client import Config

R2_BUCKET = os.environ.get("R2_BUCKET_NAME")
_s3_client = None

APP_NAME = os.environ.get("APP_NAME", "rpgmanager")

def get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            endpoint_url=os.environ.get("R2_ENDPOINT_URL"),
            aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"),
            config=Config(signature_version="s3v4"),
            region_name="auto",
        )
    return _s3_client

def put_object(path: str, data: bytes, content_type: str) -> dict:
    s3 = get_s3_client()
    s3.put_object(Bucket=R2_BUCKET, Key=path, Body=data, ContentType=content_type)
    return {"path": path}

def get_object(path: str):
    s3 = get_s3_client()
    try:
        obj = s3.get_object(Bucket=R2_BUCKET, Key=path)
    except Exception as e:
        # boto3 raises a generic ClientError for missing keys; map to 404
        from botocore.exceptions import ClientError
        if isinstance(e, ClientError) and e.response.get("Error", {}).get("Code") in ("NoSuchKey", "404"):
            raise HTTPException(status_code=404, detail="File not found")
        raise
    return obj["Body"].read(), obj.get("ContentType", "application/octet-stream")

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

# ... rest of file unchanged ...
