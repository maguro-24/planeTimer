import { useState, useEffect, useRef } from "react";
import { getWeather } from "../api/client";
import type { WeatherResponse } from "../api/client";

interface UseWeatherOptions {
  pollInterval?: number; // ms, default 60000
  enabled?: boolean;     // pause polling when flight is complete
}

interface UseWeatherResult {
  weather: WeatherResponse | null;
  error: string | null;
}

export function useWeather(
  flightId: number | null,
  options: UseWeatherOptions = {}
): UseWeatherResult {
  const { pollInterval = 60000, enabled = true } = options;

  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!flightId || !enabled) return;

    if (intervalRef.current) clearInterval(intervalRef.current);
    setError(null);

    const fetchWeather = async () => {
      try {
        const data = await getWeather(flightId);
        setWeather(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get weather");
      }
    };

    // Fetch immediately then poll
    fetchWeather();
    intervalRef.current = setInterval(fetchWeather, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [flightId, pollInterval, enabled]);

  return { weather, error };
}