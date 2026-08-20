from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models, schemas
from ..auth import (
    hash_password, verify_password, create_access_token,
    get_current_user, get_user_role,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered")

    role = db.query(models.Role).filter(models.Role.name == payload.role).first()
    if not role:
        role = db.query(models.Role).filter(models.Role.name == "citizen").first()

    user = models.User(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        password_hash=hash_password(payload.password),
        role_id=role.id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"user_id": user.id, "role": role.name, "email": user.email})
    return schemas.Token(
        access_token=token,
        user=schemas.UserOut(
            id=user.id, full_name=user.full_name, email=user.email,
            phone=user.phone, role=role.name, is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@router.post("/login", response_model=schemas.Token)
async def login(request: Request, db: Session = Depends(get_db)):
    content_type = request.headers.get("content-type", "").lower()
    username = None
    password = None

    if "application/json" in content_type:
        try:
            body = await request.json()
            username = body.get("username") or body.get("email")
            password = body.get("password")
        except Exception:
            pass

    if not username or not password:
        try:
            form = await request.form()
            username = form.get("username") or form.get("email")
            password = form.get("password")
        except Exception:
            pass

    if not username or not password:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email and password are required")

    user = db.query(models.User).filter(models.User.email == str(username).strip()).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Account disabled")

    role = db.query(models.Role).filter(models.Role.id == user.role_id).first()
    user.last_login_at = datetime.utcnow()
    db.commit()

    token = create_access_token({"user_id": user.id, "role": role.name if role else "citizen", "email": user.email})
    return schemas.Token(
        access_token=token,
        user=schemas.UserOut(
            id=user.id, full_name=user.full_name, email=user.email,
            phone=user.phone, role=role.name if role else "citizen", is_active=user.is_active,
            created_at=user.created_at,
        ),
    )


@router.get("/me", response_model=schemas.UserOut)
def get_me(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    role = db.query(models.Role).filter(models.Role.id == user.role_id).first()
    return schemas.UserOut(
        id=user.id, full_name=user.full_name, email=user.email,
        phone=user.phone, role=role.name if role else None,
        is_active=user.is_active, created_at=user.created_at,
    )
