import { useState } from "react";
import { login, signup } from "../api/client";

interface Props {
  onLoggedIn: () => void;
}

type Mode = "login" | "signup";

export default function LoginScreen({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await login(email, password);
        onLoggedIn();
      } else {
        await signup(email, password);
        setSignupSuccess(true);
        setMode("login");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-screen h-screen bg-black flex items-center justify-center">
      {/* Background — subtle star field feel */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#0f1f3d_0%,_#000_70%)]" />

      <div className="relative z-10 w-full max-w-sm px-8">
        {/* Logo */}
        <div className="mb-10 text-center">
          <h1 className="text-white text-3xl font-light tracking-[0.3em] uppercase">
            planeTimer
          </h1>
          <p className="text-slate-500 text-sm mt-2 tracking-widest uppercase">
            Virtual Flight Simulator
          </p>
        </div>

        {/* Success message after signup */}
        {signupSuccess && (
          <div className="mb-6 px-4 py-3 bg-emerald-900/40 border border-emerald-700 rounded text-emerald-400 text-sm text-center">
            Account created — you can now log in.
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="bg-white/5 border border-white/10 text-white placeholder-slate-500 rounded px-4 py-3 text-sm outline-none focus:border-white/30 transition-colors"
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 bg-white text-black text-sm font-medium tracking-widest uppercase py-3 rounded hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? "..."
              : mode === "login"
              ? "Log In"
              : "Create Account"}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="text-slate-500 text-sm text-center mt-6">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => { setMode("signup"); setError(null); setSignupSuccess(false); }}
                className="text-white hover:text-slate-300 transition-colors"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => { setMode("login"); setError(null); }}
                className="text-white hover:text-slate-300 transition-colors"
              >
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}