import { useNavigate, useParams } from "react-router-dom";

export function LobbyPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const name = sessionStorage.getItem("participant_name") || "Peserta";

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="max-w-xl w-full rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
        <div className="text-6xl mb-5">🎮</div>

        <h1 className="text-4xl font-black mb-3">Lobby Kuis</h1>

        <p className="text-slate-300 mb-2">
          Halo, <span className="font-bold text-white">{name}</span>.
        </p>

        <p className="text-slate-300 mb-8">
          Kamu sudah masuk room <span className="font-bold text-white">{roomCode}</span>.
          Tunggu admin memulai kuis.
        </p>

        <button
          onClick={() => navigate(`/play/${roomCode}`)}
          className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
        >
          Masuk Mode Aman
        </button>
      </section>
    </main>
  );
}