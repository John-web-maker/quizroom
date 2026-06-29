import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setErrorText("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    navigate("/admin");
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="text-3xl font-black mb-2">Login Admin</h1>

        <p className="text-slate-300 mb-6">
          Masuk untuk membuat quiz, membuka room, dan memantau peserta.
        </p>

        <label className="block mb-4">
          <span className="block mb-2 text-slate-300">Email</span>
          <input
            className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
            placeholder="admin@email.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block mb-6">
          <span className="block mb-2 text-slate-300">Password</span>
          <input
            className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        {errorText && (
          <div className="mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-purple-600 py-4 font-bold hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}