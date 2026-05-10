from fastapi import APIRouter, HTTPException
import time

from engine.flight import Flight
from engine.simulation import get_position
from engine.weather import get_weather
from api.schemas import FlightCreate, FlightResponse, PositionResponse, WeatherResponse

router = APIRouter()

flights = {}
flight_id_counter = 1


@router.post("/flight", response_model=FlightResponse)
def create_flight(data: FlightCreate):
    global flight_id_counter

    try:
        flight = Flight(data.from_code, data.to_code)
    except KeyError:
        raise HTTPException(status_code=400, detail="Invalid airport code")

    flight_id = flight_id_counter
    flights[flight_id] = flight
    flight_id_counter += 1

    return FlightResponse(
        flight_id=flight_id,
        distance=flight.distance,
        duration=flight.duration
    )


@router.get("/flight/{flight_id}/position", response_model=PositionResponse)
def get_flight_position(flight_id: int):
    flight = flights.get(flight_id)

    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    lat, lon, progress = get_position(flight, time.time())

    return PositionResponse(
        lat=lat,
        lon=lon,
        progress=progress
    )


@router.get("/flight/{flight_id}/weather", response_model=WeatherResponse)
def get_flight_weather(flight_id: int):
    flight = flights.get(flight_id)

    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    lat, lon, _ = get_position(flight, time.time())

    try:
        weather = get_weather(lat, lon)
    except Exception:
        raise HTTPException(status_code=502, detail="Failed to fetch weather data")

    return WeatherResponse(
        lat=lat,
        lon=lon,
        **weather
    )
