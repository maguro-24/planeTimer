import { useState, useEffect } from "react";
import { useFlight } from "../hooks/useFlight";
import { useWeather } from "../hooks/useWeather";
import { completeFlight } from "../api/client";
import IFEScreen from "./IFEScreen";
import WindowView from "./WindowView";
import ViewButton from "./ViewButton";
import type { ScreenView } from "./ViewButton";
import type { ActiveFlight } from "../App";

interface Props {
  flight: ActiveFlight;
  onFlightComplete: () => void;
}

export default function CabinView({ flight, onFlightComplete }: Props) {
  const { position, isComplete, error } = useFlight(flight.flightId);
  const { weather } = useWeather(flight.flightId, { enabled: !isComplete });
  const [view, setView] = useState<ScreenView>("map");
  const [confirmingExit, setConfirmingExit] = useState(false);

  // Tell the backend once the flight has actually finished so it counts toward stats.
  // Safe to call more than once (the backend ignores repeats); retries a few times on failure.
  useEffect(() => {
    if (!isComplete) return;
    let cancelled = false;

    async function send(attempt: number) {
      try {
        await completeFlight(flight.flightId);
      } catch {
        if (!cancelled && attempt < 3) setTimeout(() => send(attempt + 1), 5000);
      }
    }
    send(1);

    return () => {
      cancelled = true;
    };
  }, [isComplete, flight.flightId]);

  return (
    <div className="relative w-full h-full">
      <IFEScreen flight={flight} position={position} />
      <WindowView weather={weather} visible={view === "window"} />
      <ViewButton view={view} onChange={setView} />

      {error && (
        <div className="absolute top-4 left-4 z-[1500] text-xs text-red-300 bg-black/60 px-3 py-2 rounded">
          {error}
        </div>
      )}

      {/* Exit flight */}
      {!isComplete && (
        <div className="absolute bottom-6 right-6 z-[1500]">
          {confirmingExit ? (
            <div className="flex items-center gap-3 bg-black/80 border border-white/10 rounded px-4 py-3 text-sm text-white">
              <span>Leave this flight?</span>
              <button
                onClick={onFlightComplete}
                className="px-3 py-1 rounded bg-red-500/80 hover:bg-red-500 transition-colors"
              >
                Exit
              </button>
              <button
                onClick={() => setConfirmingExit(false)}
                className="px-3 py-1 rounded border border-white/20 hover:bg-white/10 transition-colors"
              >
                Stay
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmingExit(true)}
              className="px-4 py-2 text-xs tracking-widest uppercase text-white bg-black/60 border border-white/20 rounded hover:bg-white/10 transition-colors"
            >
              Exit flight
            </button>
          )}
        </div>
      )}

      {isComplete && (
        <div className="absolute inset-0 z-[2000] flex flex-col items-center justify-center bg-black/70">
          <p className="text-2xl font-light tracking-widest text-white mb-6">
            Arrived in {flight.toCode}
          </p>
          <button
            onClick={onFlightComplete}
            className="px-6 py-3 text-sm text-white border border-white/20 rounded hover:bg-white/10 transition-colors"
          >
            Back to flight selection
          </button>
        </div>
      )}
    </div>
  );
}