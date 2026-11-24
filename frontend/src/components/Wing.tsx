import wingUrl from "/home/vinn/projects/planeTimer/frontend/src/assets/Faceted Blue-Tipped Airplane Wing.png";
import { mix, rgb } from "./sky";
import type { Palette } from "./sky";

interface Props {
  palette: Palette;
}

// Where the wing tip sits, as a % of the wing image (0,0 = top-left). Tweak until it's on the tip.
const TIP = { x: 22, y: 30 };
// Real aircraft: red = left wing, green = right wing. This view looks out the right side.
const LIGHT: [number, number, number] = [255, 42, 42];

export default function Wing({ palette }: Props) {
  const brightness = 0.22 + 0.78 * palette.bright;
  const tint = mix(palette.lit, palette.bottom, 0.3);
  // Lights read stronger in the dark and wash out in full sun.
  const lightPower = 1 - 0.55 * palette.bright;

  return (
    <div
      className="absolute right-0 landscape:-right-[20vw] bottom-0 pointer-events-none w-full landscape:w-[82vw] landscape:bottom-auto landscape:top-[calc(35.8vh-0vw)]"
      style={{ isolation: "isolate" }}
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

      {/* Wing tip light */}
      <style>{`
        @keyframes wingtip-strobe {
          0%, 8%    { opacity: 1; }
          12%, 22%  { opacity: 0.05; }
          26%, 34%  { opacity: 1; }
          40%, 100% { opacity: 0.05; }
        }
        .wingtip-flash { animation: wingtip-strobe 1.8s linear infinite; }
        @media (prefers-reduced-motion: reduce) { .wingtip-flash { animation: none; } }
      `}</style>
      <div
        className="absolute"
        style={{ left: `${TIP.x}%`, top: `${TIP.y}%`, opacity: lightPower }}
      >
        <div
          className="wingtip-flash absolute rounded-full"
          style={{
            width: "min(7vw, 70px)",
            height: "min(7vw, 70px)",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, ${rgb(LIGHT, 0.55)} 0%, ${rgb(LIGHT, 0)} 70%)`,
          }}
        />
        <div
          className="wingtip-flash absolute rounded-full"
          style={{
            width: "max(5px, 0.6vw)",
            height: "max(5px, 0.6vw)",
            transform: "translate(-50%, -50%)",
            background: "#ff5a5a",
            boxShadow: `0 0 8px 2px ${rgb(LIGHT, 0.9)}`,
          }}
        />
      </div>
    </div>
  );
}