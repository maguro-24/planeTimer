from pydantic import BaseModel, field_validator, model_validator


class FlightCreate(BaseModel):
    from_code: str
    to_code: str

    @field_validator("from_code", "to_code")
    @classmethod
    def validate_airport(cls, v):
        return v.upper()

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


class AirportSearchResult(BaseModel):
    code: str
    name: str
    country: str
    lat: float
    lon: float
    distance_miles: float
    duration_minutes: float


class AirportSearchResponse(BaseModel):
    from_code: str
    target_minutes: float
    results: list[AirportSearchResult]