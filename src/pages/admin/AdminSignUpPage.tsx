import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

export function AdminSignUpPage() {
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();

    setErrorText("");
    setSuccessText("");
    setLoading(true);

    const cleanName = displayName.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      setErrorText("Nama admin minimal 2 karakter.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorText("Password minimal 6 karakter.");
      setLoading(false);
      return;
    }

    const redirectUrl = `${window.location.origin}${window.location.pathname}#/admin/login`;

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          display_name: cleanName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    if (data.session) {
      navigate("/admin");
      return;
    }

    setSuccessText(
      "Akun berhasil dibuat. Jika email confirmation aktif, cek email untuk konfirmasi akun sebelum login."
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleSignUp}
        className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="text-3xl font-black mb-2">Daftar Admin</h1>

        <p className="text-slate-300 mb-6">
          Buat akun untuk membuat, mengelola, dan memonitor kuis sendiri.
        </p>

        <label className="block mb-4">
          <span className="block mb-2 text-slate-300">Nama admin</span>

          <input
            className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
            placeholder="Contoh: Erin"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={60}
          />
        </label>

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
              placeholder="Minimal 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
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

        {successText && (
          <div className="mb-5 rounded-2xl bg-green-500/10 border border-green-500/30 p-4 text-green-300">
            {successText}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-purple-600 py-4 font-bold hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Membuat akun..." : "Daftar"}
        </button>

        <p className="mt-6 text-center text-slate-300">
          Sudah punya akun?{" "}
          <Link to="/admin/login" className="text-purple-300 underline">
            Login admin
          </Link>
        </p>
      </form>
    </main>
  );
}