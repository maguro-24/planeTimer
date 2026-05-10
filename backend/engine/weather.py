import httpx
import math
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from timezonefinder import TimezoneFinder

_tf = TimezoneFinder()

# Open-Meteo WMO weather condition codes mapped to a human-readable condition
WMO_CONDITIONS = {
    0: "clear",
    1: "mostly_clear", 2: "partly_cloudy", 3: "overcast",
    45: "fog", 48: "fog",
    51: "drizzle", 53: "drizzle", 55: "drizzle",
    61: "rain", 63: "rain", 65: "heavy_rain",
    71: "snow", 73: "snow", 75: "heavy_snow",
    77: "snow",
    80: "showers", 81: "showers", 82: "heavy_showers",
    85: "snow_showers", 86: "snow_showers",
    95: "thunderstorm", 96: "thunderstorm", 99: "thunderstorm",
}


def get_local_time(lat: float, lon: float) -> dict:
    """
    Get accurate local time at a lat/lon using real timezone data.
    Handles DST and timezone boundaries correctly.
    """
    tz_name = _tf.timezone_at(lat=lat, lng=lon)
    if not tz_name:
        # Fallback to solar time if timezone lookup fails (e.g. middle of ocean)
        utc_now = datetime.now(timezone.utc)
        utc_offset_hours = lon / 15.0
        local_hour_float = (utc_now.hour + utc_now.minute / 60.0 + utc_offset_hours) % 24
        if local_hour_float < 0:
            local_hour_float += 24
        local_hour = int(local_hour_float)
        local_minute = int((local_hour_float - local_hour) * 60)
        return {
            "local_hour": local_hour,
            "local_minute": local_minute,
            "time_of_day": round(local_hour_float / 24.0, 4),
            "utc_offset_hours": round(lon / 15.0, 2),
            "timezone": "solar",
        }

    local_now = datetime.now(ZoneInfo(tz_name))
    utc_offset_hours = local_now.utcoffset().total_seconds() / 3600
    local_hour_float = local_now.hour + local_now.minute / 60.0

    return {
        "local_hour": local_now.hour,
        "local_minute": local_now.minute,
        "time_of_day": round(local_hour_float / 24.0, 4),
        "utc_offset_hours": round(utc_offset_hours, 2),
        "timezone": tz_name,
    }


def get_sun_position(lat: float, lon: float) -> dict:
    """
    Calculate sun elevation angle at a given lat/lon and current UTC time.
    Positive elevation = sun is above horizon (daytime).
    Returns elevation in degrees and a normalized sun_factor (-1.0 to 1.0).
    Useful for smooth dawn/dusk transitions rather than a hard day/night switch.
    """
    utc_now = datetime.now(timezone.utc)
    day_of_year = utc_now.timetuple().tm_yday

    # Solar declination (degrees) — how far the sun is north/south
    declination = 23.45 * math.sin(math.radians((360 / 365) * (day_of_year - 81)))

    # Hour angle — how far the sun is from solar noon (use true solar time, not clock time)
    utc_offset_hours = lon / 15.0
    local_hour_float = (utc_now.hour + utc_now.minute / 60.0 + utc_offset_hours) % 24
    hour_angle = (local_hour_float - 12) * 15  # degrees

    # Sun elevation angle
    lat_r = math.radians(lat)
    dec_r = math.radians(declination)
    ha_r = math.radians(hour_angle)

    elevation = math.degrees(
        math.asin(
            math.sin(lat_r) * math.sin(dec_r) +
            math.cos(lat_r) * math.cos(dec_r) * math.cos(ha_r)
        )
    )

    # sun_factor: 1.0 = high noon, 0.0 = horizon, -1.0 = deep night
    sun_factor = max(-1.0, min(1.0, elevation / 90.0))

    return {
        "sun_elevation": round(elevation, 2),
        "sun_factor": round(sun_factor, 4),
        "is_day": elevation > 0,
    }


def get_weather(lat: float, lon: float) -> dict:
    """
    Fetch current weather at a given lat/lon using Open-Meteo.
    Returns condition string, temperature, cloud cover, and is_day flag.
    No API key required.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": [
            "temperature_2m",
            "weather_code",
            "cloud_cover",
            "is_day",
        ],
        "forecast_days": 1,
    }

    response = httpx.get(url, params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    current = data["current"]
    wmo_code = current["weather_code"]

    local_time = get_local_time(lat, lon)
    sun = get_sun_position(lat, lon)

    return {
        "is_day": sun["is_day"],
        "condition": WMO_CONDITIONS.get(wmo_code, "unknown"),
        "temperature": current["temperature_2m"],
        "cloud_cover": current["cloud_cover"],
        "weather_code": wmo_code,
        "sun_elevation": sun["sun_elevation"],
        "sun_factor": sun["sun_factor"],
        "local_hour": local_time["local_hour"],
        "local_minute": local_time["local_minute"],
        "time_of_day": local_time["time_of_day"],
        "utc_offset_hours": local_time["utc_offset_hours"],
        "timezone": local_time["timezone"],
    }