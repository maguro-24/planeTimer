import { Map as MapIcon, Cloud } from "lucide-react";

export type ScreenView = "map" | "window";

interface Props {
  view: ScreenView;
  onChange: (view: ScreenView) => void;
}

// One button that flips between the map (default) and the window view.
export default function ViewButton({ view, onChange }: Props) {
  const toWindow = view === "map";
  return (
    <button
      onClick={() => onChange(toWindow ? "window" : "map")}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1500] flex items-center gap-2 px-4 py-2 text-xs tracking-widest uppercase text-white bg-black/75 border border-white/20 rounded hover:bg-black/90 transition-colors"
    >
      {toWindow ? <Cloud size={16} /> : <MapIcon size={16} />}
      {toWindow ? "Window view" : "Map view"}
    </button>
  );
}
