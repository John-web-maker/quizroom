import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function getOrCreateDeviceId() {
  const storageKey = "quizroom_device_id";
  const existingDeviceId = localStorage.getItem(storageKey);

  if (existingDeviceId) {
    return existingDeviceId;
  }

  const newDeviceId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  localStorage.setItem(storageKey, newDeviceId);

  return newDeviceId;
}

export function JoinPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [manualRoomCode, setManualRoomCode] = useState(roomCode ?? "");
  const [displayName, setDisplayName] = useState("");

  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();

    setErrorText("");
    setLoading(true);

    const cleanRoomCode = manualRoomCode.trim().toUpperCase();
    const cleanName = displayName.trim();

    if (!cleanRoomCode) {
      setErrorText("Kode kuis wajib diisi.");
      setLoading(false);
      return;
    }

    if (!cleanName) {
      setErrorText("Nama peserta wajib diisi.");
      setLoading(false);
      return;
    }

    const deviceId = getOrCreateDeviceId();

    const { data, error } = await supabase.rpc("join_room", {
      p_room_code: cleanRoomCode,
      p_display_name: cleanName,
      p_device_id: deviceId,
    });

    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    sessionStorage.setItem("participant_id", data.participant_id);
    sessionStorage.setItem("quiz_id", data.quiz_id);
    sessionStorage.setItem("room_code", data.room_code);
    sessionStorage.setItem("session_token", data.session_token);
    sessionStorage.setItem("participant_name", cleanName);

    navigate(`/lobby/${data.room_code}`);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <form
        onSubmit={handleJoin}
        className="w-full max-w-md rounded-3xl bg-slate-900 p-8 shadow-xl"
      >
        <h1 className="text-3xl font-black mb-2">Masuk Kuis</h1>

        <p className="text-slate-300 mb-6">
          Masukkan kode kuis dari admin, lalu isi nama peserta.
        </p>

        <label className="block mb-5">
          <span className="block mb-2 text-slate-300">Kode kuis</span>

          <input
            className="w-full uppercase rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
            placeholder="Contoh: SRB3V2"
            value={manualRoomCode}
            onChange={(e) => setManualRoomCode(e.target.value.toUpperCase())}
            required
            maxLength={20}
          />
        </label>

        <label className="block mb-5">
          <span className="block mb-2 text-slate-300">Nama peserta</span>

          <input
            className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
            placeholder="Tulis nama kamu"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={40}
          />
        </label>

        <div className="mb-5 rounded-2xl bg-slate-800/70 border border-slate-700 p-4 text-sm text-slate-300">
          Satu perangkat hanya dapat digunakan untuk satu peserta dalam room
          yang sama. Sistem akan menyimpan ID perangkat di browser ini.
        </div>

        {errorText && (
          <div className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-2xl bg-purple-600 py-4 font-bold hover:bg-purple-700 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Join Lobby"}
        </button>
      </form>
    </main>
  );
}