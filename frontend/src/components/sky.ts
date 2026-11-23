export type RGB = [number, number, number];

export interface Palette {
  top: RGB;      // sky at the top of the window
  bottom: RGB;   // sky at the horizon (also the haze color)
  lit: RGB;      // sunlit side of clouds / wing
  shade: RGB;    // shadowed side of clouds
  rim: RGB;      // light catching the window frame
  wall: RGB;     // cabin wall around the window
  glow: number;  // 0..1 horizon glow strength (sunrise / sunset)
  bright: number; // 0..1 overall scene brightness (wing, frame)
}

function hex(h: string): RGB {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

// Keyframes by sun elevation in degrees (sun_factor * 90). Elevation, not sun_factor
// itself, drives them because sunrise/sunset only span a few degrees.
const STOPS: { elev: number; p: Palette }[] = [
  { elev: -18, p: { top: hex("#02030a"), bottom: hex("#070b1a"), lit: hex("#1c2340"), shade: hex("#080b18"), rim: hex("#1a1a24"), wall: hex("#07070a"), glow: 0, bright: 0.12 } },
  { elev: -12, p: { top: hex("#050a1f"), bottom: hex("#141b3d"), lit: hex("#2a3158"), shade: hex("#0c1024"), rim: hex("#20202c"), wall: hex("#0b0b10"), glow: 0.05, bright: 0.2 } },
  { elev: -6, p: { top: hex("#12205a"), bottom: hex("#5a4a86"), lit: hex("#8a78b0"), shade: hex("#3c3566"), rim: hex("#5a4a5e"), wall: hex("#1b1822"), glow: 0.4, bright: 0.45 } },
  { elev: -1, p: { top: hex("#2b4686"), bottom: hex("#e8825f"), lit: hex("#ffb89a"), shade: hex("#7d5a8c"), rim: hex("#f0955f"), wall: hex("#3a2d30"), glow: 1, bright: 0.75 } },
  { elev: 4, p: { top: hex("#3f6fb8"), bottom: hex("#f6c58a"), lit: hex("#ffe0c4"), shade: hex("#8e8aa8"), rim: hex("#e9b88a"), wall: hex("#77695f"), glow: 0.6, bright: 0.9 } },
  { elev: 15, p: { top: hex("#3b7fd4"), bottom: hex("#b4d8f5"), lit: hex("#ffffff"), shade: hex("#a5b9d6"), rim: hex("#d8d2c6"), wall: hex("#a39e92"), glow: 0.1, bright: 1 } },
  { elev: 70, p: { top: hex("#2563eb"), bottom: hex("#c4e2fb"), lit: hex("#ffffff"), shade: hex("#aebfd8"), rim: hex("#d8d2c6"), wall: hex("#b3ada0"), glow: 0, bright: 1 } },
];

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function rgb(c: RGB, alpha = 1): string {
  return `rgba(${Math.round(c[0])}, ${Math.round(c[1])}, ${Math.round(c[2])}, ${alpha})`;
}

export function skyPalette(elevationDeg: number): Palette {
  const e = Math.max(STOPS[0].elev, Math.min(STOPS[STOPS.length - 1].elev, elevationDeg));
  let i = 0;
  while (i < STOPS.length - 2 && e > STOPS[i + 1].elev) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const t = (e - a.elev) / (b.elev - a.elev);
  return {
    top: mix(a.p.top, b.p.top, t),
    bottom: mix(a.p.bottom, b.p.bottom, t),
    lit: mix(a.p.lit, b.p.lit, t),
    shade: mix(a.p.shade, b.p.shade, t),
    rim: mix(a.p.rim, b.p.rim, t),
    wall: mix(a.p.wall, b.p.wall, t),
    glow: a.p.glow + (b.p.glow - a.p.glow) * t,
    bright: a.p.bright + (b.p.bright - a.p.bright) * t,
  };
}
