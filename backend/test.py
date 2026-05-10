from engine.flight import Flight
from engine.simulation import get_position
from engine.weather import get_weather
from engine.airports import AIRPORTS
import time

#uvicorn api.main:app --reload

flight = Flight("MSP", "ORD")

print("=== Flight Info ===")
print("Distance:", flight.distance)
print("Duration (seconds):", flight.duration)
print()

def print_weather(weather: dict, label: str = "Weather"):
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