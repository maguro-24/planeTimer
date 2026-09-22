from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from engine.db import db_get
from api.auth import get_user_id

router = APIRouter(prefix="/user")


class UserStats(BaseModel):
    total_miles: float
    total_time_seconds: float
    total_flights: int
    recent_flights: list


@router.get("/stats", response_model=UserStats)
def get_stats(user_id: str = Depends(get_user_id)):
    # Get user stats
    stats = db_get("user_stats", params={"user_id": f"eq.{user_id}", "select": "*"})
    if not stats:
        raise HTTPException(status_code=404, detail="User stats not found")

    # Get 10 most recent flights
    recent = db_get("flights", params={
        "user_id": f"eq.{user_id}",
        "select": "id,from_code,to_code,distance,duration,start_time",
        "order": "start_time.desc",
        "limit": "10",
    })

    return UserStats(
        total_miles=stats[0]["total_miles"],
        total_time_seconds=stats[0]["total_time_seconds"],
        total_flights=stats[0]["total_flights"],
        recent_flights=recent,
    )