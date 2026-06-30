import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AdminLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();

    setErrorText("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
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
            type="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>

        <label className="block mb-5">
          <span className="block mb-2 text-slate-300">Password</span>

          <div className="flex rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden focus-within:border-purple-500">
            <input
              className="flex-1 bg-transparent p-4 outline-none"
              type={showPassword ? "text" : "password"}
              placeholder="Masukkan password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="px-4 font-bold text-purple-300 hover:bg-slate-700"
            >
              {showPassword ? "Sembunyikan" : "Lihat"}
            </button>
          </div>
        </label>

        {errorText && (
          <div className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-purple-600 py-4 font-bold hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>

        <p className="mt-6 text-center text-slate-300">
          Belum punya akun admin?{" "}
          <Link to="/admin/signup" className="text-purple-300 underline">
            Daftar akun
          </Link>
        </p>

        <p className="mt-4 text-center text-slate-400 text-sm">
          Peserta tidak perlu login admin. Peserta cukup masuk lewat halaman
          join dan memasukkan kode kuis.
        </p>
      </form>
    </main>
  );
}