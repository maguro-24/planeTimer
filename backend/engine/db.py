import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
}


def db_get(table: str, params: dict = None) -> list:
    response = httpx.get(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers=HEADERS,
        params=params,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


def db_post(table: str, data: dict) -> dict:
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**HEADERS, "Prefer": "return=representation"},
        json=data,
        timeout=10,
    )
    response.raise_for_status()
    return response.json()[0]


def db_rpc(fn: str, params: dict):
    """Call a Supabase RPC (PostgreSQL function)."""
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/rpc/{fn}",
        headers=HEADERS,
        json=params,
        timeout=10,
    )
    response.raise_for_status()
    return response.json() if response.content else None