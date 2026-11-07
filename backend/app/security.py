from datetime import datetime, timedelta, timezone

import secrets

import bcrypt
import jwt

from app.config import get_settings

settings = get_settings()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(subject: str, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload = {"sub": subject, "exp": expire, "iat": datetime.now(timezone.utc), "jti": secrets.token_hex(8)}
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm], options={"require": ["exp", "sub"]})
    except jwt.PyJWTError:
        return None


# Verified against when the account does not exist, so a missing email takes as long as a wrong password.
_DUMMY_HASH = hash_password(secrets.token_hex(16))


def burn_password_check(plain_password: str) -> None:
    verify_password(plain_password, _DUMMY_HASH)
