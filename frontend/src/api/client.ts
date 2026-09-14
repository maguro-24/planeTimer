const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// ─── Token Storage ────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem("access_token");
}

export function getRefreshToken(): string | null {
  return localStorage.getItem("refresh_token");
}

export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

export function clearTokens(): void {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

// ─── Core Fetch ───────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  const token = getAccessToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Auto-refresh token on 401 and retry once
  if (res.status === 401 && retry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return apiFetch<T>(path, options, false);
    } else {
      clearTokens();
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const res = await fetch(
      `${BASE_URL}/auth/refresh?refresh_token=${encodeURIComponent(refreshToken)}`,
      { method: "POST" }
    );
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token, data.refresh_token);
    return true;
  } catch {
    return false;
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<string> {
  const data = await apiFetch<{
    access_token: string;
    refresh_token: string;
    user_id: string;
  }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setTokens(data.access_token, data.refresh_token);
  return data.user_id;
}

export async function signup(email: string, password: string): Promise<void> {
  await apiFetch("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function logout(): void {
  clearTokens();
}

// ─── Flights ──────────────────────────────────────────────────────────────────

export interface FlightResponse {
  flight_id: number;
  distance: number;
  duration: number;
}

export async function createFlight(
  fromCode: string,
  toCode: string
): Promise<FlightResponse> {
  return apiFetch<FlightResponse>("/flight", {
    method: "POST",
    body: JSON.stringify({ from_code: fromCode, to_code: toCode }),
  });
}

export interface PositionResponse {
  lat: number;
  lon: number;
  progress: number;
}

export async function getPosition(flightId: number): Promise<PositionResponse> {
  return apiFetch<PositionResponse>(`/flight/${flightId}/position`);
}

export interface WeatherResponse {
  is_day: boolean;
  condition: string;
  temperature: number;
  cloud_cover: number;
  weather_code: number;
  sun_elevation: number;
  sun_factor: number;
  local_hour: number;
  local_minute: number;
  time_of_day: number;
  utc_offset_hours: number;
  timezone: string;
  lat: number;
  lon: number;
}

export async function getWeather(flightId: number): Promise<WeatherResponse> {
  return apiFetch<WeatherResponse>(`/flight/${flightId}/weather`);
}

// ─── Airport Search ───────────────────────────────────────────────────────────

export interface AirportResult {
  code: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  distance_miles: number;
  duration_minutes: number;
}

export interface AirportSearchResponse {
  from_code: string;
  target_minutes: number;
  results: AirportResult[];
}

export async function searchAirports(
  fromCode: string,
  durationMinutes: number
): Promise<AirportSearchResponse> {
  return apiFetch<AirportSearchResponse>(
    `/airports/search?from_code=${fromCode}&duration=${durationMinutes}`
  );
}

// ─── User Stats ───────────────────────────────────────────────────────────────

export interface UserStats {
  total_miles: number;
  total_time_seconds: number;
  total_flights: number;
  recent_flights: {
    id: number;
    from_code: string;
    to_code: string;
    distance: number;
    duration: number;
    start_time: string;
  }[];
}

export async function getUserStats(): Promise<UserStats> {
  return apiFetch<UserStats>("/user/stats");
}

// ─── Airport Name Search ──────────────────────────────────────────────────────

export interface AirportNameResult {
  code: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export async function searchAirportsByName(q: string): Promise<AirportNameResult[]> {
  return apiFetch<AirportNameResult[]>(`/airports/name?q=${encodeURIComponent(q)}`);
}