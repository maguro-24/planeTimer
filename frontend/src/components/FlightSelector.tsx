import { useState, useRef, useEffect } from "react";
import { searchAirports, createFlight, logout, searchAirportsByName } from "../api/client";
import type { FlightResponse, AirportResult, AirportNameResult } from "../api/client";
import type { ActiveFlight } from "../App";

interface Props {
  onFlightCreated: (flight: ActiveFlight) => void;
}

type SearchMode = "duration" | "route";

interface AirportInputProps {
  value: string;
  onChange: (code: string) => void;
  placeholder: string;
  className?: string;
}

function AirportInput({ value, onChange, placeholder, className = "" }: AirportInputProps) {
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<AirportNameResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);

    if (val.length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      onChange("");
      return;
    }

    // Debounce the search for both codes and names
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchAirportsByName(val);
        setSuggestions(results);
        setShowDropdown(results.length > 0);

        // If exact IATA code match, set it directly
        const exact = results.find(r => r.code === val.toUpperCase());
        if (exact) {
          onChange(exact.code);
        } else {
          onChange("");
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }

  function handleSelect(airport: AirportNameResult) {
    setQuery(`${airport.code} – ${airport.name}`);
    onChange(airport.code);
    setSuggestions([]);
    setShowDropdown(false);
  }

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
        className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors"
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
          ...
        </span>
      )}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#0f1525] border border-white/10 rounded overflow-hidden z-50 shadow-xl">
          {suggestions.map((airport) => (
            <button
              key={airport.code}
              onMouseDown={() => handleSelect(airport)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
            >
              <span className="text-white font-medium tracking-widest">{airport.code}</span>
              <span className="text-slate-400 ml-2">{airport.name}</span>
              <span className="text-slate-600 ml-2 text-xs">{airport.country}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FlightSelector({ onFlightCreated }: Props) {
  const [mode, setMode] = useState<SearchMode>("duration");

  // Duration mode state
  const [fromCode, setFromCode] = useState("");
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [results, setResults] = useState<AirportResult[]>([]);
  const [selected, setSelected] = useState<AirportResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Route mode state
  const [routeFrom, setRouteFrom] = useState("");
  const [routeTo, setRouteTo] = useState("");

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDurationSearch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResults([]);
    setSelected(null);

    if (!fromCode) {
      setError("Select a valid departure airport.");
      return;
    }

    const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    if (totalMinutes < 30) {
      setError("Minimum flight duration is 30 minutes.");
      return;
    }

    setSearching(true);
    try {
      const data = await searchAirports(fromCode, totalMinutes);
      setResults(data.results);
      if (data.results.length === 0) {
        setError("No airports found for that duration. Try adjusting the time.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function handleRouteCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!routeFrom || !routeTo) {
      setError("Select valid airports for both departure and destination.");
      return;
    }
    if (routeFrom === routeTo) {
      setError("Departure and destination must be different.");
      return;
    }

    setCreating(true);
    try {
      const flight: FlightResponse = await createFlight(routeFrom, routeTo);
      onFlightCreated({
        flightId: flight.flight_id,
        fromCode: routeFrom,
        toCode: routeTo,
        distance: flight.distance,
        duration: flight.duration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flight. Check both airport codes are valid.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSelectFlight() {
    if (!selected || !fromCode) return;
    setError(null);
    setCreating(true);

    try {
      const flight: FlightResponse = await createFlight(fromCode, selected.code);
      onFlightCreated({
        flightId: flight.flight_id,
        fromCode: fromCode,
        toCode: selected.code,
        distance: flight.distance,
        duration: flight.duration,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create flight");
    } finally {
      setCreating(false);
    }
  }

  function formatDuration(mins: number): string {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  function switchMode(m: SearchMode) {
    setMode(m);
    setError(null);
    setResults([]);
    setSelected(null);
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f1f3d_0%,_#000_70%)]" />

      <div className="relative z-10 w-full max-w-md px-8">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-white text-2xl font-light tracking-[0.3em] uppercase">
              planeTimer
            </h1>
            <p className="text-slate-500 text-sm mt-1 tracking-widest uppercase">
              Choose your flight
            </p>
          </div>
          <button
            onClick={() => { logout(); window.location.reload(); }}
            className="text-slate-600 hover:text-slate-400 text-xs tracking-widest uppercase transition-colors"
          >
            Log out
          </button>
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 mb-6 bg-white/5 rounded p-1">
          <button
            onClick={() => switchMode("duration")}
            className={`flex-1 py-2 text-xs tracking-widest uppercase rounded transition-colors ${
              mode === "duration"
                ? "bg-white text-black font-medium"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Search by time
          </button>
          <button
            onClick={() => switchMode("route")}
            className={`flex-1 py-2 text-xs tracking-widest uppercase rounded transition-colors ${
              mode === "route"
                ? "bg-white text-black font-medium"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Choose route
          </button>
        </div>

        {/* Duration search mode */}
        {mode === "duration" && (
          <form onSubmit={handleDurationSearch} className="flex flex-col gap-4 mb-6">
            <AirportInput
              value={fromCode}
              onChange={setFromCode}
              placeholder="Departure — city or IATA code"
            />
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  min={0}
                  max={15}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">hr</span>
              </div>
              <div className="flex-1 relative">
                <input
                  type="number"
                  placeholder="0"
                  value={minutes}
                  onChange={(e) => setMinutes(e.target.value)}
                  min={0}
                  max={59}
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">min</span>
              </div>
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-white text-black text-sm font-medium tracking-widest uppercase py-3 rounded hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {searching ? "Searching..." : "Find Airports"}
            </button>
          </form>
        )}

        {/* Route mode */}
        {mode === "route" && (
          <form onSubmit={handleRouteCreate} className="flex flex-col gap-4 mb-6">
            <AirportInput
              value={routeFrom}
              onChange={setRouteFrom}
              placeholder="From — city or IATA code"
            />
            <AirportInput
              value={routeTo}
              onChange={setRouteTo}
              placeholder="To — city or IATA code"
            />
            <button
              type="submit"
              disabled={creating}
              className="bg-white text-black text-sm font-medium tracking-widest uppercase py-3 rounded hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {creating
                ? "Preparing flight..."
                : routeFrom && routeTo
                ? `Fly ${routeFrom} → ${routeTo}`
                : "Start Flight"}
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Duration search results */}
        {mode === "duration" && results.length > 0 && (
          <div className="flex flex-col gap-2 mb-6">
            <p className="text-slate-500 text-xs tracking-widest uppercase mb-1">
              Select destination
            </p>
            {results.map((airport) => (
              <button
                key={airport.code}
                onClick={() => setSelected(airport)}
                className={`text-left px-4 py-3 rounded border transition-colors ${
                  selected?.code === airport.code
                    ? "border-white/40 bg-white/10 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-white font-medium tracking-widest text-sm">
                      {airport.code}
                    </span>
                    <span className="text-slate-400 text-sm ml-2">
                      {airport.name}
                    </span>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatDuration(airport.duration_minutes)}</div>
                    <div>{Math.round(airport.distance_miles).toLocaleString()} mi</div>
                  </div>
                </div>
                <div className="text-slate-600 text-xs mt-1">{airport.country}</div>
              </button>
            ))}
          </div>
        )}

        {/* Start flight from duration search */}
        {mode === "duration" && selected && (
          <button
            onClick={handleSelectFlight}
            disabled={creating}
            className="w-full bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium tracking-widest uppercase py-3 rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating
              ? "Preparing flight..."
              : `Fly ${fromCode} → ${selected.code}`}
          </button>
        )}
      </div>
    </div>
  );
}