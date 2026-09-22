# ✈️ planeTimer

**planeTimer** is a real-time flight simulation web application that lets users create virtual flights between real airports and experience the journey from inside a 3D aircraft cabin.

Using live weather, real-world airport data, and time zone calculations, the application recreates what passengers would see during a flight—from changing daylight and weather conditions to an interactive in-flight entertainment display.

---

## Features

- ✈️ Create flights between real airports
- 🌎 Simulate flights in real time
- 🗺️ Live aircraft position tracking
- 🌤️ Real-time weather using Open-Meteo
- 🌅 Dynamic sky based on location and time of day
- 👤 Secure user authentication
- 📊 Flight history and personal statistics
- 💾 PostgreSQL/PostGIS-powered airport database

---

## Tech Stack

### Backend

- FastAPI
- PostgreSQL (Supabase)
- PostGIS
- Open-Meteo API
- JWT Authentication

### Frontend *(In Development)*

- React
- Vite
- React Three Fiber
- Three.js
- Leaflet
- GSAP
- Tailwind CSS

---

## Project Structure

```text
planeTimer/
├── backend/
│   ├── api/
│   ├── engine/
│   ├── main.py
│   └── ...
└── frontend/
```

---

## Getting Started

```bash
git clone https://github.com/<your-username>/planeTimer.git
cd planeTimer/backend
./setup.sh
source venv/bin/activate
uvicorn api.main:app --reload
```

Create a `.env` file:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
```

---

## Current Progress

### ✅ Completed

- User authentication
- Flight creation
- Airport search
- Flight simulation engine
- Live weather integration
- User statistics
- Airport database with PostGIS

### 🚧 In Progress

- React frontend
- 3D aircraft cabin
- Interactive in-flight entertainment display
- Dynamic sky rendering
- Weather particle effects

---

## Planned Features

- Cabin window view with dynamic weather
- Interactive IFE map
- Google OAuth
- Flight completion tracking
- Public deployment
- Mobile-friendly interface

---

## License

This project is licensed under the MIT License.
