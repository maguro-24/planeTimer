import { useState } from "react";
import { isLoggedIn } from "./api/client";
import LoginScreen from "./components/LoginScreen";
import FlightSelector from "./components/FlightSelector";
import CabinView from "./components/CabinView";

export type Screen = "login" | "select" | "cabin";

export interface ActiveFlight {
  flightId: number;
  fromCode: string;
  toCode: string;
  distance: number;
  duration: number;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(isLoggedIn() ? "select" : "login");
  const [activeFlight, setActiveFlight] = useState<ActiveFlight | null>(null);

  function handleLoggedIn() {
    setScreen("select");
  }

  function handleFlightCreated(flight: ActiveFlight) {
    setActiveFlight(flight);
    setScreen("cabin");
  }

  function handleFlightComplete() {
    setActiveFlight(null);
    setScreen("select");
  }

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      {screen === "login" && (
        <LoginScreen onLoggedIn={handleLoggedIn} />
      )}
      {screen === "select" && (
        <FlightSelector onFlightCreated={handleFlightCreated} />
      )}
      {screen === "cabin" && activeFlight && (
        <CabinView
          flight={activeFlight}
          onFlightComplete={handleFlightComplete}
        />
      )}
    </div>
  );
}