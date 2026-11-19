import { useFlight } from "../hooks/useFlight";
import IFEScreen from "./IFEScreen";
import type { ActiveFlight } from "../App";

interface Props {
  flight: ActiveFlight;
  onFlightComplete: () => void;
}

// Step 1: IFE screen only. The 3D cabin, window view and camera
// transitions get layered in here in later steps.
export default function CabinView({ flight, onFlightComplete }: Props) {
  const { position, isComplete, error } = useFlight(flight.flightId);

  return (
    <div className="relative w-full h-full">
      <IFEScreen flight={flight} position={position} />

      {error && (
        <div className="absolute bottom-4 left-4 z-[1000] text-xs text-red-300 bg-black/60 px-3 py-2 rounded">
          {error}
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