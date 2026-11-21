import { useEffect, useRef } from "react";
import { mix, rgb } from "./sky";
import type { Palette } from "./sky";

interface Props {
  palette: Palette;
  horizon: number; // 0..1, where the horizon sits from the top
  paused?: boolean; // freeze the drift (e.g. while the window view is hidden)
}

interface Blob {
  dx: number;
  dy: number;
  r: number;
}
interface Puff {
  t: number; // 0 = horizon (far), 1 = bottom edge (near)
  x: number;
  r: number;
  haze: number;
  blobs: Blob[];
}

// Far clouds drift slowly, near ones faster (seconds for one full screen width).
// Clouds move left to right: the nose is on the left, so the deck slides back toward the tail.
const LAYERS = [
  { from: 0, to: 0.3, duration: 220 },
  { from: 0.3, to: 0.65, duration: 120 },
  { from: 0.65, to: 1.01, duration: 70 },
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The same layout for a given screen size, every time (fixed seed).
function makePuffs(w: number, h: number): Puff[] {
  const rng = mulberry32(7);
  const scale = Math.min(w, h); // puff size follows the smaller screen side
  const count = Math.round(150 * Math.max(1, w / scale)); // wide screens need more puffs

  return Array.from({ length: count }, () => {
    const t = Math.pow(rng(), 1.2);
    const size = 0.45 + Math.pow(rng(), 2) * 1.7; // heavy-tailed: a few big cumulus among small ones
    const seed = rng();
    const depth = 0.03 + 0.97 * Math.pow(t, 1.4);
    const r = scale * 0.17 * depth * size + 3;

    // A lumpy cluster: many overlapping blobs of different sizes, taller in the middle.
    const n = 6 + Math.floor(seed * 5);
    const blobs: Blob[] = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5;
      blobs.push({
        dx: u * r * 2.2 + (rng() - 0.5) * r * 0.5,
        dy: -(1 - Math.abs(u) * 2) * r * 0.32 * (0.5 + rng()) + (rng() - 0.5) * r * 0.12,
        r: r * (0.38 + rng() * 0.7) * (1 - Math.abs(u) * 0.6),
      });
    }
    return { t, x: rng() * w, r, haze: Math.pow(1 - t, 1.8) * 0.75, blobs };
  }).sort((a, b) => a.t - b.t);
}

function drawPuffs(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  horizonY: number,
  p: Palette,
  from: number,
  to: number
) {
  ctx.clearRect(0, 0, w, h);
  const deckH = h - horizonY;

  for (const pf of makePuffs(w, h)) {
    if (pf.t < from || pf.t >= to) continue;
    const cy = horizonY + deckH * Math.pow(pf.t, 1.1);
    const lit = mix(p.lit, p.bottom, pf.haze);
    const shade = mix(p.shade, p.bottom, pf.haze);
    const reach = pf.r * 1.6; // how far a cluster extends sideways

    // Draw a second copy across the left/right edge so the layer tiles seamlessly.
    for (const offset of [-w, 0, w]) {
      const cx = pf.x + offset;
      if (cx + reach < 0 || cx - reach > w) continue;

      for (const b of pf.blobs) {
        ctx.save();
        ctx.translate(cx + b.dx, cy + b.dy);
        ctx.scale(1, 0.55); // flatten: we look down on the deck at a shallow angle
        // Light comes from the upper left, toward the sun-side glow.
        const g = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.4, b.r * 0.05, 0, 0, b.r);
        const midC = mix(lit, shade, 0.35);
        const edge = mix(lit, shade, 0.7);
        g.addColorStop(0, rgb(lit, 0.97));
        g.addColorStop(0.45, rgb(midC, 0.93));
        g.addColorStop(0.8, rgb(edge, 0.5));
        g.addColorStop(1, rgb(edge, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, b.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

interface LayerProps {
  palette: Palette;
  horizon: number;
  from: number;
  to: number;
  duration: number;
  paused: boolean;
}

// One depth band: drawn once into a canvas, then shown twice side by side and slid
// across by CSS (cheap, runs on the GPU) so it loops without a seam.
function CloudLayer({ palette, horizon, from, to, duration, paused }: LayerProps) {
  const outerRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLCanvasElement>(null);
  const bRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const outer = outerRef.current!;

    function render() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = outer.clientWidth;
      const h = outer.clientHeight;
      if (!w || !h) return;
      const a = aRef.current!;
      const b = bRef.current!;
      a.width = b.width = Math.round(w * dpr);
      a.height = b.height = Math.round(h * dpr);
      const ctx = a.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawPuffs(ctx, w, h, h * horizon, palette, from, to);
      b.getContext("2d")!.drawImage(a, 0, 0);
    }

    render();
    const ro = new ResizeObserver(render);
    ro.observe(outer);
    return () => ro.disconnect();
  }, [palette, horizon, from, to]);

  return (
    <div ref={outerRef} className="absolute inset-0 overflow-hidden">
      <div
        className="cloud-drift absolute top-0 left-0 h-full flex"
        style={{
          width: "200%",
          animationDuration: `${duration}s`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        <canvas ref={aRef} className="h-full" style={{ width: "50%" }} />
        <canvas ref={bRef} className="h-full" style={{ width: "50%" }} />
      </div>
    </div>
  );
}

export default function CloudDeck({ palette, horizon, paused = false }: Props) {
  const top = horizon * 100;
  return (
    <>
      <style>{`
        @keyframes cloud-drift { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .cloud-drift { animation-name: cloud-drift; animation-timing-function: linear; animation-iteration-count: infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) { .cloud-drift { animation: none; } }
      `}</style>

      {/* Static base deck: haze at the horizon fading to shade, so there are no gaps between puffs */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{
          top: `${top}%`,
          background: `linear-gradient(to bottom, ${rgb(palette.bottom)} 0%, ${rgb(
            mix(palette.bottom, palette.shade, 0.55)
          )} 35%, ${rgb(mix(palette.shade, palette.lit, 0.15))} 100%)`,
        }}
      />

      {LAYERS.map((l) => (
        <CloudLayer key={l.from} palette={palette} horizon={horizon} paused={paused} {...l} />
      ))}

      {/* Soft haze line where the deck meets the sky (static, over the moving clouds) */}
      <div
        className="absolute left-0 right-0 pointer-events-none"
        style={{
          top: `calc(${top}% - 6px)`,
          height: `calc(${(100 - top) * 0.18}% + 6px)`,
          background: `linear-gradient(to bottom, ${rgb(palette.bottom, 0)} 0%, ${rgb(
            palette.bottom,
            0.55
          )} 25%, ${rgb(palette.bottom, 0)} 100%)`,
        }}
      />
    </>
  );
}