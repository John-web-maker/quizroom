import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: string;
  title: string;
  room_code: string | null;
  status: string;
};

type Participant = {
  id: string;
  display_name: string;
  score: number;
  status: string;
};

type CheatEvent = {
  id: string;
  participant_id: string;
  event_type: string;
  severity: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export function AdminCheatingPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [cheatEvents, setCheatEvents] = useState<CheatEvent[]>([]);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!quizId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, room_code, status")
      .eq("id", quizId)
      .single();

    if (quizError) {
      setErrorText(quizError.message);
      setLoading(false);
      return;
    }

    const { data: participantData, error: participantError } = await supabase
      .from("participants")
      .select("id, display_name, score, status")
      .eq("quiz_id", quizId)
      .order("score", { ascending: false });

    if (participantError) {
      setErrorText(participantError.message);
      setLoading(false);
      return;
    }

    const { data: cheatData, error: cheatError } = await supabase
      .from("cheat_events")
      .select("id, participant_id, event_type, severity, metadata, created_at")
      .eq("quiz_id", quizId)
      .order("created_at", { ascending: false });

    if (cheatError) {
      setErrorText(cheatError.message);
      setLoading(false);
      return;
    }

    setQuiz(quizData);
    setParticipants(participantData ?? []);
    setCheatEvents(cheatData ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadData();

    const intervalId = window.setInterval(() => {
      loadData();
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [quizId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Memuat cheating monitor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <section className="mx-auto max-w-6xl">
        <Link to={`/admin/live/${quizId}`} className="text-purple-300 underline">
          ← Kembali ke Live Monitor
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-4xl font-black">Anti-Cheating Monitor</h1>
          <p className="text-slate-300 mt-2">
            Quiz: <span className="font-bold text-white">{quiz?.title}</span>
          </p>
          <p className="text-slate-300">
            Room: <span className="font-bold text-white">{quiz?.room_code}</span> · Status:{" "}
            <span className="font-bold text-white">{quiz?.status}</span>
          </p>
        </header>

        {errorText && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Total peserta</p>
            <p className="text-3xl font-black">{participants.length}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Cheating log</p>
            <p className="text-3xl font-black text-red-300">{cheatEvents.length}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Critical</p>
            <p className="text-3xl font-black text-red-300">
              {cheatEvents.filter((event) => event.severity === "critical").length}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 p-6 overflow-x-auto">
          <h2 className="text-2xl font-black mb-5">Detail Log</h2>

          {cheatEvents.length === 0 && (
            <p className="text-slate-300">Belum ada log cheating.</p>
          )}

          {cheatEvents.length > 0 && (
            <table className="w-full text-left min-w-[900px]">
              <thead className="text-slate-400">
                <tr>
                  <th className="p-3">Waktu</th>
                  <th className="p-3">Peserta</th>
                  <th className="p-3">Event</th>
                  <th className="p-3">Severity</th>
                  <th className="p-3">Metadata</th>
                </tr>
              </thead>

              <tbody>
                {cheatEvents.map((event) => {
                  const participant = participants.find(
                    (item) => item.id === event.participant_id
                  );

                  return (
                    <tr key={event.id} className="border-t border-slate-800">
                      <td className="p-3 text-slate-300">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="p-3 font-bold">
                        {participant?.display_name ?? "Peserta tidak diketahui"}
                      </td>
                      <td className="p-3">{event.event_type}</td>
                      <td className="p-3">
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-sm font-bold",
                            event.severity === "critical"
                              ? "bg-red-500/20 text-red-300"
                              : event.severity === "high"
                              ? "bg-orange-500/20 text-orange-300"
                              : "bg-yellow-500/20 text-yellow-300",
                          ].join(" ")}
                        >
                          {event.severity}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400">
                        <code>{JSON.stringify(event.metadata ?? {})}</code>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </section>
    </main>
  );
}