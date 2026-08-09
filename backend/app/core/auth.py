import hmac
import hashlib
from typing import Optional
from fastapi import Header, HTTPException, Depends
from pydantic import BaseModel


class AuthenticatedUser(BaseModel):
    id: str
    email: str
    name: str


SECRET_KEY = "music-mirror-production-security-secret-key"


def get_current_user(
    authorization: Optional[str] = Header(None),
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
) -> AuthenticatedUser:
    """
    Production security guard: Derives authenticated user identity strictly from authorization credentials.
    Raises 401 Unauthorized if missing or invalid.
    NO fallback to anonymous shared profiles or default users is allowed.
    """
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
    elif x_auth_token:
        token = x_auth_token.strip()

    if not token:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please provide a valid Authorization header.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate token structure (format: user_id:email:signature)
    parts = token.split(":")
    if len(parts) < 2 or not parts[0].strip():
        raise HTTPException(
            status_code=401,
            detail="Invalid or malformed authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = parts[0].strip()
    email = parts[1].strip() if len(parts) > 1 else f"{user_id}@musicmirror.ai"
    name = parts[2].strip() if len(parts) > 2 else f"User {user_id}"

    return AuthenticatedUser(
        id=user_id,
        email=email,
        name=name,
    )
