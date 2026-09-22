def interpolate(start, end, progress):
    return start + (end - start) * progress


def get_position(flight, current_time):
    elapsed = current_time - flight.start_time
    progress = min(elapsed / flight.duration, 1.0)

    lat = interpolate(flight.start_lat, flight.end_lat, progress)
    lon = interpolate(flight.start_lon, flight.end_lon, progress)

    return lat, lon, progress