import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, Marker, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ActiveFlight } from "../App";
import type { PositionResponse } from "../api/client";

interface Props {
  flight: ActiveFlight;
  position: PositionResponse | null;
}

// The backend interpolates lat/lon linearly, which is a straight line on a
// Web Mercator map, so the heading is the screen angle of that line.
function mercatorY(latDeg: number): number {
  const phi = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + phi / 2));
}

function headingDeg(flight: ActiveFlight): number {
  const dx = ((flight.toLon - flight.fromLon) * Math.PI) / 180;
  const dy = mercatorY(flight.toLat) - mercatorY(flight.fromLat);
  return (Math.atan2(dx, dy) * 180) / Math.PI; // 0 = north, clockwise
}

function planeIcon(heading: number): L.DivIcon {
  return L.divIcon({
    className: "",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    html: `<svg width="36" height="36" viewBox="0 0 24 24" style="transform: rotate(${heading}deg); filter: drop-shadow(0 0 6px rgba(255,255,255,0.6));">
      <path fill="white" d="M12 2c.6 0 1 .5 1 1v6.5l8 4.5v2l-8-2v4l2 1.5V21l-3-.8-3 .8v-1.5l2-1.5v-4l-8 2v-2l8-4.5V3c0-.5.4-1 1-1z"/>
    </svg>`,
  });
}

function FitRoute({ flight }: { flight: ActiveFlight }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [flight.fromLat, flight.fromLon],
        [flight.toLat, flight.toLon],
      ],
      { padding: [80, 80] }
    );
  }, [map, flight]);
  return null;
}

function formatRemaining(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function IFEScreen({ flight, position }: Props) {
  const progress = position?.progress ?? 0;
  const remaining = flight.duration * (1 - progress);
  const milesLeft = flight.distance * (1 - progress);
  const heading = headingDeg(flight);

  const from: [number, number] = [flight.fromLat, flight.fromLon];
  const to: [number, number] = [flight.toLat, flight.toLon];
  const planePos: [number, number] | null = position ? [position.lat, position.lon] : null;

  return (
    <div className="relative w-full h-full bg-[#0a0e1a] text-white">
      <MapContainer
        center={from}
        zoom={4}
        zoomControl={false}
        attributionControl={true}
        className="w-full h-full"
        style={{ background: "#0a0e1a" }}
      >
        <TileLayer
            url={`https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${import.meta.env.VITE_CARTO_KEY}`}
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
            />
        <FitRoute flight={flight} />
        <Polyline positions={[from, to]} pathOptions={{ color: "#ffffff", weight: 2, opacity: 0.35, dashArray: "6 8" }} />
        {planePos && (
          <Polyline positions={[from, planePos]} pathOptions={{ color: "#38bdf8", weight: 3 }} />
        )}
        <CircleMarker center={from} radius={6} pathOptions={{ color: "#38bdf8", fillColor: "#38bdf8", fillOpacity: 1 }} />
        <CircleMarker center={to} radius={6} pathOptions={{ color: "#ffffff", fillColor: "#0a0e1a", fillOpacity: 1 }} />
        {planePos && <Marker position={planePos} icon={planeIcon(heading)} />}
      </MapContainer>

      {/* Flight info bar */}
      <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none bg-gradient-to-b from-black/80 to-transparent px-8 pt-6 pb-12">
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <span className="text-3xl font-light tracking-widest">{flight.fromCode}</span>
            <span className="text-slate-500">→</span>
            <span className="text-3xl font-light tracking-widest">{flight.toCode}</span>
          </div>
          <div className="text-right text-sm text-slate-300">
            <div>{formatRemaining(remaining)} remaining</div>
            <div className="text-slate-500">{Math.round(milesLeft).toLocaleString()} mi to go</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute bottom-0 left-0 right-0 z-[1000] h-1 bg-white/10">
        <div
          className="h-full bg-sky-400 transition-all duration-1000"
          style={{ width: `${Math.min(100, progress * 100)}%` }}
        />
      </div>
    </div>
  );
}