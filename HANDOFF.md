# planeTimer — Backend Handoff

## Overview
A flight simulation web app where users create a virtual flight between real airports and experience it in real time through a 3D airplane cabin. Two views: an IFE screen with a live map, and a window view with a dynamic sky reflecting real weather and time of day at the aircraft's current position.

---

## Stack

### Backend (complete)
- **FastAPI** — REST API
- **Supabase (PostgreSQL + PostGIS)** — database, auth, airport search
- **Open-Meteo** — free weather API, no key required
- **Render** — planned deployment target

### Frontend (not started)
- **React + Vite** — app framework, builds to static files for GitHub Pages
- **React Three Fiber** — Three.js in React
- **Three.js** — 3D cabin, sky shader, weather particles
- **GSAP** — smooth camera transitions between views
- **Leaflet** — map on the IFE screen
- **Tailwind** — 2D UI overlays (arrows, login screen, flight selector)

---

## Project Structure

```
planeTimer/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── test.py                  # Manual test script
│   ├── seed_airports.py         # One-time airport seeding script (already run, do not re-run)
│   ├── requirements.txt
│   ├── setup.sh                 # Creates venv and installs dependencies
│   ├── .env                     # Secret keys (never commit this)
│   ├── api/
│   │   ├── auth.py              # JWT verification middleware (uses Supabase JWKS, ES256)
│   │   ├── auth_routes.py       # POST /auth/signup, /auth/login, /auth/refresh
│   │   ├── routes.py            # Flight and airport endpoints
│   │   ├── schemas.py           # Pydantic request/response models
│   │   └── user_routes.py       # GET /user/stats
│   └── engine/
│       ├── db.py                # Supabase REST helpers (db_get, db_post, db_rpc)
│       ├── flight.py            # Flight class, haversine distance, duration estimate
│       ├── simulation.py        # Linear position interpolation
│       └── weather.py           # Open-Meteo weather, sun position, local time
└── frontend/                    # Not started yet
```

Note: `airports.py` still exists in the repo but is no longer used. Airport data lives in Supabase. It can be deleted.

---

## Environment Variables (.env)
```
SUPABASE_URL=https://tloecypyozksyvoznxhr.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
```
`SUPABASE_JWT_SECRET` is not needed — auth uses Supabase's public JWKS endpoint for ES256 token verification.

---

## Running Locally
```bash
source venv/bin/activate
uvicorn api.main:app --reload
```
Or from scratch:
```bash
./setup.sh
source venv/bin/activate
uvicorn api.main:app --reload
```

---

## API Endpoints

All endpoints except `/auth/*` require a Bearer token in the `Authorization` header.

### Auth
| Method | Path | Body | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | `{email, password}` | Create account |
| POST | `/auth/login` | `{email, password}` | Login, returns `access_token` + `refresh_token` |
| POST | `/auth/refresh` | `?refresh_token=...` | Refresh access token |

### Flights
| Method | Path | Description |
|--------|------|-------------|
| POST | `/flight` | Create a flight, returns `flight_id`, `distance` (miles), `duration` (seconds) |
| GET | `/flight/{id}/position` | Current `lat`, `lon`, and `progress` (0.0–1.0) |
| GET | `/flight/{id}/weather` | Full weather + sun position + local time at aircraft location |

### Airports
| Method | Path | Description |
|--------|------|-------------|
| GET | `/airports/search?from_code=MSP&duration=120` | 5 airports closest to target duration (minutes) from a given airport |

### User
| Method | Path | Description |
|--------|------|-------------|
| GET | `/user/stats` | `total_miles`, `total_time_seconds`, `total_flights`, last 10 `recent_flights` |

---

## Testing a Full Flow (curl)
```bash
# Login and create a flight in one command
curl -X POST http://localhost:8000/flight \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")" \
  -d '{"from_code": "MSP", "to_code": "JFK"}'
```

---

## Supabase Database

### Tables
| Table | Description |
|-------|-------------|
| `airports` | 7,883 IATA airports with PostGIS `geography` column. Seeded once via `seed_airports.py`. |
| `flights` | All created flights. Linked to `auth.users` by `user_id` (NOT NULL). |
| `user_stats` | `total_miles`, `total_time_seconds`, `total_flights` per user. Auto-created on signup via trigger. |

### SQL Functions
| Function | Description |
|----------|-------------|
| `search_airports_by_duration(from_code, target_minutes, limit_count)` | PostGIS radius search, returns 5 closest airports by estimated flight duration |
| `increment_user_stats(p_user_id, p_miles, p_seconds)` | Atomically updates user stats. Currently called on flight creation — should be moved to flight completion |
| `handle_new_user()` | Trigger that creates a `user_stats` row on signup |

### Auth
- Supabase Auth handles all authentication
- Email confirmation is **disabled** (re-enable for production)
- Google OAuth **not yet configured** — can be added later with no backend changes
- Tokens use **ES256** — verified via Supabase's JWKS endpoint at `/auth/v1/.well-known/jwks.json`
- JWKS keys are cached in memory after first fetch (`_jwks` global in `auth.py`)

---

## Weather Response Fields
Returned by `GET /flight/{id}/weather`:

| Field | Type | Description |
|-------|------|-------------|
| `condition` | str | `clear`, `rain`, `thunderstorm`, `snow`, etc. (mapped from WMO code) |
| `temperature` | float | °C |
| `cloud_cover` | int | 0–100% |
| `weather_code` | int | Raw WMO code from Open-Meteo |
| `is_day` | bool | Based on calculated sun elevation (more accurate than Open-Meteo's value) |
| `sun_elevation` | float | Degrees above/below horizon |
| `sun_factor` | float | **-1.0 (deep night) → 0.0 (horizon) → 1.0 (high noon)** — primary input for sky gradient |
| `local_hour` | int | Real local hour using `timezonefinder` |
| `local_minute` | int | Real local minute |
| `time_of_day` | float | 0.0–1.0 (0=midnight, 0.5=noon) |
| `utc_offset_hours` | float | UTC offset at aircraft location |
| `timezone` | str | IANA timezone string (e.g. `America/Chicago`), `"solar"` over oceans |
| `lat` | float | Aircraft latitude at time of request |
| `lon` | float | Aircraft longitude at time of request |

---

## Known Issues / TODOs

### Backend
- [ ] `increment_user_stats` is called on flight **creation** — should be moved to a `POST /flight/{id}/complete` endpoint called by the frontend when `progress` hits 1.0
- [ ] Airport validation in `schemas.py` no longer checks against a local dict — invalid codes will fail at the DB lookup in `flight.py`. Consider adding a lightweight validation endpoint or DB check in `FlightCreate`
- [ ] `airports.py` is dead code — can be deleted
- [ ] CORS is wide open (`allow_origins=["*"]`) — tighten to GitHub Pages URL before going live
- [ ] No rate limiting on weather or position endpoints — add before going live
- [ ] `flights` table has no `completed` boolean — add one if you want to distinguish in-progress vs finished flights in the DB

### Deployment
- [ ] Deploy backend to Render
- [ ] Set environment variables in Render dashboard (same as `.env`)
- [ ] Render free tier spins down after 15min inactivity — first request after sleep takes 30–60s

### Frontend (not started)
- [ ] Set up React + Vite project in `frontend/`
- [ ] Build 3D cabin scene (React Three Fiber)
- [ ] Window view sky shader driven by `sun_factor` and `condition`
- [ ] Weather particle system (rain, snow)
- [ ] IFE screen with Leaflet map showing route + live position
- [ ] Camera transition between views (GSAP)
- [ ] Login / signup UI
- [ ] Flight creation UI — airport search by duration, pick from 5 results
- [ ] User stats page
- [ ] Auto-refresh JWT token before expiry (1 hour default)
- [ ] Add Google OAuth
- [ ] Poll `/position` every 5s, `/weather` every 60s

---

## Frontend Polling Strategy
```
/flight/{id}/position  →  every 5 seconds
/flight/{id}/weather   →  every 60 seconds
```
Weather doesn't change faster than that and Open-Meteo is a free public API — don't hammer it.

---

## Sky Shader Inputs (for frontend reference)
| Backend field | Frontend use |
|---------------|-------------|
| `sun_factor` | Primary sky gradient driver (-1=night, 0=horizon, 1=noon) |
| `condition` | Particle system type (rain, snow, clear) |
| `cloud_cover` | Cloud density/opacity |
| `is_day` | Star visibility toggle |
| `local_hour` + `local_minute` | Clock display |
| `timezone` | Timezone label display |
