from engine.flight import Flight
from engine.simulation import get_position
from engine.weather import get_weather
from engine.db import db_post, db_get, db_rpc
from datetime import datetime, timezone
import time

# uvicorn api.main:app --reload

USER_ID = "c99aa348-9bd3-4a56-9ebf-b808ecd9722f"

# Create flight in the database
print("=== Creating Flight in Database ===")
flight = Flight("MSP", "PRO")

row = db_post("flights", {
    "user_id": USER_ID,
    "from_code": flight.from_code,
    "to_code": flight.to_code,
    "distance": flight.distance,
    "duration": flight.duration,
    "start_time": datetime.fromtimestamp(flight.start_time, tz=timezone.utc).isoformat(),
})
flight_id = row["id"]
print(f"Flight created with ID: {flight_id}")

print()
print("=== Flight Info ===")
print("Distance:", flight.distance)
print("Duration (seconds):", flight.duration)
print()


def print_weather(weather: dict):
    print(f"  Condition:        {weather['condition']}")
    print(f"  Temperature:      {weather['temperature']}°C")
    print(f"  Cloud Cover:      {weather['cloud_cover']}%")
    print(f"  WMO Code:         {weather['weather_code']}")
    print(f"  Is Day:           {weather['is_day']}")
    print(f"  Sun Elevation:    {weather['sun_elevation']}°")
    print(f"  Sun Factor:       {weather['sun_factor']} (-1=night, 0=horizon, 1=noon)")
    print(f"  Local Time:       {weather['local_hour']:02d}:{weather['local_minute']:02d} ({weather['timezone']})")
    print(f"  Time of Day:      {weather['time_of_day']} (0=midnight, 0.5=noon, 1=midnight)")
    print(f"  UTC Offset:       {weather['utc_offset_hours']}h")


print("=== Initial Weather at Departure ===")
weather = get_weather(flight.start_lat, flight.start_lon)
print_weather(weather)
print()
print("=== Live Position + Weather ===")
last_weather_check = 0
current_weather = None

while True:
    now = time.time()

    # Reload flight from DB each loop to simulate real API behavior
    row = db_get("flights", params={"id": f"eq.{flight_id}", "select": "*"})[0]
    start_time = datetime.fromisoformat(row["start_time"]).timestamp()
    flight.start_time = start_time

    lat, lon, progress = get_position(flight, now)

    # Only fetch weather every 30 seconds
    if current_weather is None or (now - last_weather_check) >= 30:
        current_weather = get_weather(lat, lon)
        last_weather_check = now
        print(f"  [weather updated]")
        print_weather(current_weather)

    print(f"Lat: {lat:.4f}, Lon: {lon:.4f}, Progress: {progress:.2%}")

    if progress >= 1.0:
        print()
        print("=== Flight Complete ===")
        print("Weather at destination:")
        final_weather = get_weather(flight.end_lat, flight.end_lon)
        print_weather(final_weather)
        break

    time.sleep(2)

# Update user stats only after flight completes
db_rpc("increment_user_stats", {
    "p_user_id": USER_ID,
    "p_miles": flight.distance,
    "p_seconds": flight.duration,
})
print()
print("User stats updated.")