import math
import time
from engine.db import db_get


def get_airport(code: str) -> dict:
    results = db_get("airports", params={"code": f"eq.{code}", "select": "code,lat,lon,name,country"})
    if not results:
        raise KeyError(f"Airport not found: {code}")
    return results[0]


class Flight:
    def __init__(self, from_code: str, to_code: str, start_time: float = None):
        self.from_code = from_code
        self.to_code = to_code

        from_airport = get_airport(from_code)
        to_airport = get_airport(to_code)

        self.start_lat = from_airport["lat"]
        self.start_lon = from_airport["lon"]
        self.end_lat = to_airport["lat"]
        self.end_lon = to_airport["lon"]

        self.distance = self._haversine()
        self.duration = self._estimate_duration()

        self.start_time = start_time if start_time else time.time()

    def _haversine(self):
        R = 3958.8
        lat1, lon1 = self.start_lat, self.start_lon
        lat2, lon2 = self.end_lat, self.end_lon

        phi1, phi2 = math.radians(lat1), math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
        return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1-a))

    def _estimate_duration(self):
        speed = 434.488  # knots
        climb_pen = 10   # min 10
        tax_time = 20    # min 20
        return (((self.distance / speed) * 60) + climb_pen + tax_time) * 60  # sec