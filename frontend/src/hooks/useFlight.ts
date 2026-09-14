import { useState, useEffect, useRef } from "react";
import { getPosition } from "../api/client";
import type { PositionResponse } from "../api/client";

interface UseFlightOptions {
  pollInterval?: number; // ms, default 5000
}

interface UseFlightResult {
  position: PositionResponse | null;
  isComplete: boolean;
  error: string | null;
}

export function useFlight(
  flightId: number | null,
  options: UseFlightOptions = {}
): UseFlightResult {
  const { pollInterval = 5000 } = options;

  const [position, setPosition] = useState<PositionResponse | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!flightId) return;

    // Clear any existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsComplete(false);
    setError(null);

    const fetchPosition = async () => {
      try {
        const data = await getPosition(flightId);
        setPosition(data);

        if (data.progress >= 1.0) {
          setIsComplete(true);
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to get position");
      }
    };

    // Fetch immediately then poll
    fetchPosition();
    intervalRef.current = setInterval(fetchPosition, pollInterval);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [flightId, pollInterval]);

  return { position, isComplete, error };
}