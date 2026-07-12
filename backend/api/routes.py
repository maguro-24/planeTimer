from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timezone
import time

from engine.flight import Flight
from engine.simulation import get_position
from engine.weather import get_weather
from engine.db import db_get, db_post, db_rpc
from api.auth import get_user_id
from api.schemas import (
    FlightCreate,
    FlightResponse,
    PositionResponse,
    WeatherResponse,
    AirportSearchResult,
    AirportSearchResponse,
)

router = APIRouter()


def _load_flight(flight_id: int, user_id: str) -> Flight:
    """Load a flight from Supabase, ensuring it belongs to the requesting user."""
    results = db_get("flights", params={
        "id": f"eq.{flight_id}",
        "user_id": f"eq.{user_id}",
        "select": "*",
    })
    if not results:
        raise HTTPException(status_code=404, detail="Flight not found")

    row = results[0]
    flight = Flight(
        from_code=row["from_code"],
        to_code=row["to_code"],
        start_time=datetime.fromisoformat(row["start_time"]).timestamp(),
    )
    return flight


@router.post("/flight", response_model=FlightResponse)
def create_flight(data: FlightCreate, user_id: str = Depends(get_user_id)):
    try:
        flight = Flight(data.from_code, data.to_code)
    except KeyError as e:
        raise HTTPException(status_code=400, detail=str(e))

    row = db_post("flights", {
        "user_id": user_id,
        "from_code": flight.from_code,
        "to_code": flight.to_code,
        "distance": flight.distance,
        "duration": flight.duration,
        "start_time": datetime.fromtimestamp(flight.start_time, tz=timezone.utc).isoformat(),
    })

    # Update user stats
    db_rpc("increment_user_stats", {
        "p_user_id": user_id,
        "p_miles": flight.distance,
        "p_seconds": flight.duration,
    })

    return FlightResponse(
        flight_id=row["id"],
        distance=flight.distance,
        duration=flight.duration,
    )


@router.get("/flight/{flight_id}/position", response_model=PositionResponse)
def get_flight_position(flight_id: int, user_id: str = Depends(get_user_id)):
    flight = _load_flight(flight_id, user_id)
    lat, lon, progress = get_position(flight, time.time())
    return PositionResponse(lat=lat, lon=lon, progress=progress)


@router.get("/flight/{flight_id}/weather", response_model=WeatherResponse)
def get_flight_weather(flight_id: int, user_id: str = Depends(get_user_id)):
    flight = _load_flight(flight_id, user_id)
    lat, lon, _ = get_position(flight, time.time())

    try:
        weather = get_weather(lat, lon)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data")

    return WeatherResponse(lat=lat, lon=lon, **weather)


@router.get("/airports/search", response_model=AirportSearchResponse)
def search_airports(from_code: str, duration: float, user_id: str = Depends(get_user_id)):
    try:
        results = db_rpc("search_airports_by_duration", {
            "from_code": from_code.upper(),
            "target_minutes": duration,
            "limit_count": 5,
        })
    except Exception:
        raise HTTPException(status_code=502, detail="Airport search failed")

    if not results:
        raise HTTPException(status_code=404, detail="No airports found for that duration")

    return AirportSearchResponse(
        from_code=from_code.upper(),
        target_minutes=duration,
        results=[
            AirportSearchResult(
                code=r["code"],
                name=r["name"],
                country=r["country"],
                lat=r["lat"],
                lon=r["lon"],
                distance_miles=round(r["distance_miles"], 1),
                duration_minutes=round(r["duration_minutes"], 1),
            )
            for r in results
        ]
    )