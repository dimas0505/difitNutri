from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Literal, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt

# ----------------------------------------------------------------------------
# Load env
# ----------------------------------------------------------------------------
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'dinutri_db')
JWT_SECRET = os.environ.get('JWT_SECRET')  # May be None; we'll generate ephemeral
JWT_ALGO = 'HS256'
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

if not MONGO_URL:
    raise RuntimeError("MONGO_URL must be set in backend/.env")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ----------------------------------------------------------------------------
# App and Router
# ----------------------------------------------------------------------------
app = FastAPI()
api = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------------
# Security helpers
# ----------------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain, hashed)
    except Exception:
        return False


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    secret = JWT_SECRET or os.environ.get('JWT_SECRET')
    if not secret:
        # Ephemeral for dev container session
        secret = str(uuid.uuid4())
    encoded_jwt = jwt.encode(to_encode, secret, algorithm=JWT_ALGO)
    return encoded_jwt


async def decode_token(token: str) -> Dict[str, Any]:
    secret = JWT_SECRET or os.environ.get('JWT_SECRET')
    if not secret:
        secret = str(uuid.uuid4())  # This will fail to decode previously-issued tokens, ok for dev
    try:
        payload = jwt.decode(token, secret, algorithms=[JWT_ALGO])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    payload = await decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_role(*roles: str):
    async def _role_dep(user: Dict[str, Any] = Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient role")
        return user
    return _role_dep

# ----------------------------------------------------------------------------
# Models (Pydantic) - use UUID string IDs; dates as ISO strings
# ----------------------------------------------------------------------------
class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class AuthLoginRequest(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: str
    role: Literal['nutritionist','patient']
    name: str
    email: EmailStr
    createdAt: str
    updatedAt: str

class PatientCreate(BaseModel):
    name: str
    email: EmailStr
    birthDate: Optional[str] = None
    sex: Optional[str] = None
    heightCm: Optional[float] = None
    weightKg: Optional[float] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

class PatientOut(PatientCreate):
    id: str
    ownerId: str
    createdAt: str
    updatedAt: str

class MealItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    description: str
    amount: Optional[str] = None
    substitutions: Optional[List[str]] = None

class Meal(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    items: List[MealItem] = []
    notes: Optional[str] = None

class PrescriptionCreate(BaseModel):
    patientId: str
    nutritionistId: Optional[str] = None
    title: str
    status: Literal['draft','published'] = 'draft'
    meals: List[Meal] = []
    generalNotes: Optional[str] = None

class PrescriptionOut(PrescriptionCreate):
    id: str
    publishedAt: Optional[str] = None
    createdAt: str
    updatedAt: str

class InviteCreate(BaseModel):
    email: EmailStr
    expiresInHours: Optional[int] = 72

class InviteOut(BaseModel):
    id: str
    nutritionistId: str
    token: str
    email: EmailStr
    status: Literal['active','used','expired']
    expiresAt: Optional[str] = None

class InviteAcceptRequest(BaseModel):
    name: str
    password: str
    birthDate: Optional[str] = None
    sex: Optional[str] = None
    heightCm: Optional[float] = None
    weightKg: Optional[float] = None
    phone: Optional[str] = None
    notes: Optional[str] = None

# ----------------------------------------------------------------------------
# Utilities
# ----------------------------------------------------------------------------

def to_doc_id(doc: Dict[str, Any]) -> Dict[str, Any]:
    # Convert Mongo _id to id and drop _id
    if doc is None:
        return doc
    d = dict(doc)
    d.pop('_id', None)
    return d

async def seed_default_nutritionist():
    existing = await db.users.find_one({"email": "pro@dinutri.app"})
    if existing:
        return
    user = {
        "id": str(uuid.uuid4()),
        "role": "nutritionist",
        "name": "Pro Nutritionist",
        "email": "pro@dinutri.app",
        "passwordHash": get_password_hash("password123"),
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    await db.users.insert_one(user)

# ----------------------------------------------------------------------------
# Routes
# ----------------------------------------------------------------------------
@api.get("/")
async def root():
    return {"message": "DiNutri API running"}


# Auth
@api.post("/auth/login", response_model=TokenResponse)
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username.lower()
    password = form_data.password
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user.get("passwordHash", "")):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token({"sub": user["id"], "role": user["role"]})
    return TokenResponse(access_token=token)

@api.get("/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(**to_doc_id(user))

# Patients
@api.post("/patients", response_model=PatientOut)
async def create_patient(payload: PatientCreate, user=Depends(require_role('nutritionist'))):
    now = now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "ownerId": user["id"],
        **payload.model_dump(exclude_none=True),
        "createdAt": now,
        "updatedAt": now,
    }
    await db.patients.insert_one(doc)
    return PatientOut(**doc)

@api.get("/patients", response_model=List[PatientOut])
async def list_patients(user=Depends(require_role('nutritionist'))):
    pts = await db.patients.find({"ownerId": user["id"]}).to_list(length=None)
    return [PatientOut(**to_doc_id(p)) for p in pts]

@api.get("/patients/{patient_id}", response_model=PatientOut)
async def get_patient(patient_id: str, user=Depends(get_current_user)):
    pt = await db.patients.find_one({"id": patient_id})
    if not pt:
        raise HTTPException(404, "Patient not found")
    # Access control: nutritionist owner or the patient themself
    if user["role"] == "nutritionist" and pt["ownerId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "patient" and user.get("patientId") != patient_id:
        raise HTTPException(403, "Forbidden")
    return PatientOut(**to_doc_id(pt))

@api.put("/patients/{patient_id}", response_model=PatientOut)
async def update_patient(patient_id: str, payload: PatientCreate, user=Depends(require_role('nutritionist'))):
    pt = await db.patients.find_one({"id": patient_id})
    if not pt:
        raise HTTPException(404, "Patient not found")
    if pt["ownerId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    updates = payload.model_dump(exclude_none=True)
    updates["updatedAt"] = now_iso()
    await db.patients.update_one({"id": patient_id}, {"$set": updates})
    pt2 = await db.patients.find_one({"id": patient_id})
    return PatientOut(**to_doc_id(pt2))

# Prescriptions
@api.post("/prescriptions", response_model=PrescriptionOut)
async def create_prescription(payload: PrescriptionCreate, user=Depends(require_role('nutritionist'))):
    # Ensure the patient belongs to this nutritionist
    pt = await db.patients.find_one({"id": payload.patientId})
    if not pt or pt["ownerId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    now = now_iso()
    doc = {
        "id": str(uuid.uuid4()),
        "patientId": payload.patientId,
        "nutritionistId": user["id"],
        "title": payload.title,
        "status": payload.status,
        "meals": [m.model_dump() for m in payload.meals],
        "generalNotes": payload.generalNotes,
        "publishedAt": now if payload.status == 'published' else None,
        "createdAt": now,
        "updatedAt": now,
    }
    await db.prescriptions.insert_one(doc)
    return PrescriptionOut(**doc)

@api.get("/patients/{patient_id}/prescriptions", response_model=List[PrescriptionOut])
async def list_prescriptions(patient_id: str, user=Depends(get_current_user)):
    pt = await db.patients.find_one({"id": patient_id})
    if not pt:
        raise HTTPException(404, "Patient not found")
    # ACL
    if user["role"] == "nutritionist" and pt["ownerId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "patient" and user.get("patientId") != patient_id:
        raise HTTPException(403, "Forbidden")
    pres = await db.prescriptions.find({"patientId": patient_id}).sort("createdAt", -1).to_list(length=None)
    return [PrescriptionOut(**to_doc_id(p)) for p in pres]

@api.get("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(prescription_id: str, user=Depends(get_current_user)):
    p = await db.prescriptions.find_one({"id": prescription_id})
    if not p:
        raise HTTPException(404, "Not found")
    # ACL: must be owner nutritionist or patient linked
    pt = await db.patients.find_one({"id": p["patientId"]})
    if user["role"] == "nutritionist" and pt["ownerId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "patient" and user.get("patientId") != pt["id"]:
        raise HTTPException(403, "Forbidden")
    return PrescriptionOut(**to_doc_id(p))

@api.put("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
async def update_prescription(prescription_id: str, payload: PrescriptionCreate, user=Depends(require_role('nutritionist'))):
    p = await db.prescriptions.find_one({"id": prescription_id})
    if not p:
        raise HTTPException(404, "Not found")
    if p["nutritionistId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    updates = payload.model_dump(exclude_none=True)
    updates["updatedAt"] = now_iso()
    if updates.get("status") == 'published' and not p.get("publishedAt"):
        updates["publishedAt"] = now_iso()
    await db.prescriptions.update_one({"id": prescription_id}, {"$set": updates})
    p2 = await db.prescriptions.find_one({"id": prescription_id})
    return PrescriptionOut(**to_doc_id(p2))

@api.post("/prescriptions/{prescription_id}/publish", response_model=PrescriptionOut)
async def publish_prescription(prescription_id: str, user=Depends(require_role('nutritionist'))):
    p = await db.prescriptions.find_one({"id": prescription_id})
    if not p:
        raise HTTPException(404, "Not found")
    if p["nutritionistId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    now = now_iso()
    await db.prescriptions.update_one({"id": prescription_id}, {"$set": {"status": "published", "publishedAt": now, "updatedAt": now}})
    p2 = await db.prescriptions.find_one({"id": prescription_id})
    return PrescriptionOut(**to_doc_id(p2))

# Latest published for a patient (patient view shortcut)
@api.get("/patients/{patient_id}/latest", response_model=Optional[PrescriptionOut])
async def latest_published(patient_id: str, user=Depends(get_current_user)):
    pt = await db.patients.find_one({"id": patient_id})
    if not pt:
        raise HTTPException(404, "Patient not found")
    if user["role"] == "nutritionist" and pt["ownerId"] != user["id"]:
        raise HTTPException(403, "Forbidden")
    if user["role"] == "patient" and user.get("patientId") != patient_id:
        raise HTTPException(403, "Forbidden")
    p = await db.prescriptions.find({"patientId": patient_id, "status": "published"}).sort("publishedAt", -1).to_list(length=1)
    return PrescriptionOut(**to_doc_id(p[0])) if p else None

# Invites
@api.post("/invites", response_model=InviteOut)
async def create_invite(payload: InviteCreate, user=Depends(require_role('nutritionist'))):
    token = str(uuid.uuid4())
    expires_at = None
    if payload.expiresInHours and payload.expiresInHours > 0:
        expires_at = (datetime.now(timezone.utc) + timedelta(hours=payload.expiresInHours)).isoformat()
    doc = {
        "id": str(uuid.uuid4()),
        "nutritionistId": user["id"],
        "token": token,
        "email": payload.email.lower(),
        "status": "active",
        "expiresAt": expires_at,
    }
    await db.invites.insert_one(doc)
    return InviteOut(**doc)

@api.get("/invites/{token}", response_model=InviteOut)
async def get_invite(token: str):
    inv = await db.invites.find_one({"token": token})
    if not inv:
        raise HTTPException(404, "Invite not found")
    # Check expiry
    if inv.get("expiresAt"):
        if datetime.fromisoformat(inv["expiresAt"]) < datetime.now(timezone.utc):
            inv["status"] = "expired"
    return InviteOut(**to_doc_id(inv))

@api.post("/invites/{token}/accept", response_model=UserOut)
async def accept_invite(token: str, payload: InviteAcceptRequest):
    inv = await db.invites.find_one({"token": token})
    if not inv:
        raise HTTPException(404, "Invite not found")
    if inv.get("status") != "active":
        raise HTTPException(400, "Invite not active")
    if inv.get("expiresAt") and datetime.fromisoformat(inv["expiresAt"]) < datetime.now(timezone.utc):
        await db.invites.update_one({"id": inv["id"]}, {"$set": {"status": "expired"}})
        raise HTTPException(400, "Invite expired")

    # Create patient user and patient record, link them
    now = now_iso()
    patient_user = {
        "id": str(uuid.uuid4()),
        "role": "patient",
        "name": payload.name,
        "email": inv["email"],
        "passwordHash": get_password_hash(payload.password),
        "createdAt": now,
        "updatedAt": now,
        # link to patientId after creation
    }

    patient_doc = {
        "id": str(uuid.uuid4()),
        "ownerId": inv["nutritionistId"],
        "name": payload.name,
        "email": inv["email"],
        "birthDate": payload.birthDate,
        "sex": payload.sex,
        "heightCm": payload.heightCm,
        "weightKg": payload.weightKg,
        "phone": payload.phone,
        "notes": payload.notes,
        "createdAt": now,
        "updatedAt": now,
    }

    await db.patients.insert_one(patient_doc)
    patient_user["patientId"] = patient_doc["id"]
    await db.users.insert_one(patient_user)
    await db.invites.update_one({"id": inv["id"]}, {"$set": {"status": "used"}})

    return UserOut(**to_doc_id(patient_user))

# Include router
app.include_router(api)

# Logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    await seed_default_nutritionist()


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()