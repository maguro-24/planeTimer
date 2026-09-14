import os
import airportsdata
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",
    "on-conflict": "code",
}


def seed_airports():
    airports = airportsdata.load("IATA")

    batch = []
    skipped = 0

    for code, info in airports.items():
        # Skip entries missing critical data
        if not code or not info.get("lat") or not info.get("lon"):
            skipped += 1
            continue

        batch.append({
            "code": code,
            "name": info.get("name", ""),
            "city": info.get("city", ""),
            "country": info.get("country", ""),
            "region": info.get("subd", ""),
            "lat": info["lat"],
            "lon": info["lon"],
            "location": f"POINT({info['lon']} {info['lat']})",
        })

        # Insert in batches of 500 to avoid request size limits
        if len(batch) == 500:
            _insert_batch(batch)
            batch = []

    # Insert any remaining
    if batch:
        _insert_batch(batch)

    print(f"Done. Skipped {skipped} airports with missing data.")


def _insert_batch(batch: list):
    response = httpx.post(
        f"{SUPABASE_URL}/rest/v1/airports",
        headers=HEADERS,
        json=batch,
        timeout=30,
    )
    if response.status_code not in (200, 201):
        print(f"Error inserting batch: {response.status_code} {response.text}")
    else:
        print(f"Inserted {len(batch)} airports")


if __name__ == "__main__":
    seed_airports()