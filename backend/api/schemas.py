from pydantic import BaseModel, field_validator, model_validator
from engine.airports import AIRPORTS

VALID_AIRPORTS = set(AIRPORTS.keys())


class FlightCreate(BaseModel):
    from_code: str
    to_code: str

    @field_validator("from_code", "to_code")
    @classmethod
    def validate_airport(cls, v):
        v = v.upper()
        if v not in VALID_AIRPORTS:
            raise ValueError(f"Invalid airport code: {v}")
        return v

    @model_validator(mode="after")
    def validate_different_airports(self):
        if self.from_code == self.to_code:
            raise ValueError("from_code and to_code must be different")
        return self


class FlightResponse(BaseModel):
    flight_id: int
    distance: float
    duration: float


class PositionResponse(BaseModel):
    lat: float
    lon: float
    progress: float


class WeatherResponse(BaseModel):
    is_day: bool
    condition: str
    temperature: float
    cloud_cover: int
    weather_code: int
    sun_elevation: float
    sun_factor: float
    local_hour: int
    local_minute: int
    time_of_day: float
    utc_offset_hours: float
    timezone: str
    lat: float
    lon: float