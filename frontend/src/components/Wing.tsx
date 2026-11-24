import wingUrl from "/home/vinn/projects/planeTimer/frontend/src/assets/Faceted Blue-Tipped Airplane Wing.png";
import { mix, rgb } from "./sky";
import type { Palette } from "./sky";

interface Props {
  palette: Palette;
}

// The wing, flush with the right edge so it runs off the screen. On wide screens its tip sits
// about a third of the way down (31.8vh); on tall screens it hangs from the bottom corner.
// It dims with the light and picks up a warm tint at sunrise and sunset.
export default function Wing({ palette }: Props) {
  const brightness = 0.22 + 0.78 * palette.bright;
  const tint = mix(palette.lit, palette.bottom, 0.3);

  return (
    <div
className="absolute right-0 landscape:-right-[20vw] bottom-0 pointer-events-none w-full landscape:w-[82vw] landscape:bottom-auto landscape:top-[calc(35.8vh-0vw)]"      style={{ isolation: "isolate" }}
    >
      <img
        src={wingUrl}
        alt=""
        draggable={false}
        className="block w-full h-auto select-none"
        style={{ filter: `brightness(${brightness})` }}
      />
      {/* Warm light on the wing, masked to the wing's own shape */}
      <div
        className="absolute inset-0"
        style={{
          background: rgb(tint, Math.min(1, palette.glow * 0.9)),
          mixBlendMode: "soft-light",
          WebkitMaskImage: `url(${wingUrl})`,
          maskImage: `url(${wingUrl})`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      />
    </div>
  );
}