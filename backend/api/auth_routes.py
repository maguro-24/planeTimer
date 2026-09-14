import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Content-Type": "application/json",
}

router = APIRouter(prefix="/auth")


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


@router.post("/signup")
def signup(data: AuthRequest):
    response = httpx.post(
        f"{SUPABASE_URL}/auth/v1/signup",
        headers=HEADERS,
        json={"email": data.email, "password": data.password},
        timeout=10,
    )
    body = response.json()

    if response.status_code != 200 or "error" in body:
        raise HTTPException(
            status_code=400,
            detail=body.get("error_description") or body.get("msg") or "Signup failed"
        )

    return {
        "message": "Signup successful. Check your email to confirm your account.",
        "user_id": body.get("user", {}).get("id"),
    }


@router.post("/login")
def login(data: AuthRequest):
    response = httpx.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers=HEADERS,
        json={"email": data.email, "password": data.password},
        timeout=10,
    )
    body = response.json()

    if response.status_code != 200 or "error" in body:
        raise HTTPException(
            status_code=401,
            detail=body.get("error_description") or "Invalid email or password"
        )

    return {
        "access_token": body["access_token"],
        "refresh_token": body["refresh_token"],
        "expires_in": body["expires_in"],
        "user_id": body["user"]["id"],
    }


@router.post("/refresh")
def refresh_token(refresh_token: str):
    response = httpx.post(
        f"{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
        headers=HEADERS,
        json={"refresh_token": refresh_token},
        timeout=10,
    )
    body = response.json()

    if response.status_code != 200 or "error" in body:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    return {
        "access_token": body["access_token"],
        "refresh_token": body["refresh_token"],
        "expires_in": body["expires_in"],
    }