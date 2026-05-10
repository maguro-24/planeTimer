import math
import time
from engine.airports import AIRPORTS


class Flight:
    def __init__(self, from_code, to_code):
        self.from_code = from_code
        self.to_code = to_code
        

        self.start_lat, self.start_lon = AIRPORTS[from_code]
        self.end_lat, self.end_lon = AIRPORTS[to_code]

        self.distance = self._haversine()
        self.duration = self._estimate_duration()

        self.start_time = time.time()

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
        speed = 434.488 # knots
        climb_pen = 10 #min
        tax_time = 20 #min
        return (((self.distance / speed) * 60) + climb_pen + tax_time) * 60 #sec