import { useMemo } from "react";
import type { WeatherResponse } from "../api/client";
import { skyPalette, mix, rgb } from "./sky";
import CloudDeck from "./CloudDeck";
import Wing from "./Wing";

interface Props {
  weather: WeatherResponse | null;
  visible: boolean;
}

const HORIZON = 0.5; // horizon height on screen, 0 = top, 1 = bottom

// Full-screen view out of the window: sky, cloud deck and wing, lit by the sun at the
// aircraft's position. Weather (cloud cover, rain, snow, stars) comes later.
export default function WindowView({ weather, visible }: Props) {
  // Round to half a degree so the cloud canvas isn't redrawn for tiny changes.
  const elevation = weather ? Math.round(weather.sun_factor * 90 * 2) / 2 : null;
  const palette = useMemo(() => (elevation === null ? null : skyPalette(elevation)), [elevation]);

  const sky = palette
    ? `linear-gradient(to bottom, ${rgb(palette.top)} 0%, ${rgb(mix(palette.top, palette.bottom, 0.8))} ${
        HORIZON * 100 - 4
      }%, ${rgb(palette.bottom)} ${HORIZON * 100}%)`
    : "#1b2233";

  return (
    <div
      className={`absolute inset-0 z-[1200] overflow-hidden transition-opacity duration-500 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      style={{ background: sky }}
    >
      {palette && (
        <>
          {/* Sunrise / sunset glow along the horizon, strongest on the sun side */}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(ellipse 70% 26% at 20% ${HORIZON * 100}%, ${rgb(
                mix(palette.bottom, palette.lit, 0.35),
                0.85 * palette.glow
              )}, transparent 70%)`,
            }}
          />
          <CloudDeck palette={palette} horizon={HORIZON} paused={!visible} />
          <Wing palette={palette} />
        </>
      )}
    </div>
  );
}