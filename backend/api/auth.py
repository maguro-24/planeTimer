import os
import httpx
from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")

security = HTTPBearer()

_jwks = None

def _get_jwks():
    """Fetch Supabase's public JWKS keys (cached after first fetch)."""
    global _jwks
    if _jwks is None:
        response = httpx.get(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json", timeout=10)
        response.raise_for_status()
        _jwks = response.json()
    return _jwks


def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify the JWT token from the Authorization header using Supabase's public JWKS.
    Returns the decoded token payload (includes user id as 'sub').
    """
    token = credentials.credentials
    try:
        jwks = _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
        )
        return payload
    except JWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """Extract the user ID from the JWT payload."""
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    return user_id