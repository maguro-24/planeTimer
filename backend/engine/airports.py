import airportsdata

def _load_airports(country: str | None = "US") -> dict:
    """Load airports keyed by IATA code as (lat, lon) tuples.
    Pass country=None to load all airports worldwide.
    """
    raw = airportsdata.load("IATA")
    return {
        code: (info["lat"], info["lon"])
        for code, info in raw.items()
        if code  # filter out entries with empty IATA codes
        and (country is None or info["country"] == country)
    }

AIRPORTS = _load_airports(country="US")   # swap to None for worldwide