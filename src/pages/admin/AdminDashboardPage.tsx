import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: string;
  title: string;
  status: string;
  room_code: string | null;
  current_question_order: number;
  created_at: string;
};

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [title, setTitle] = useState("");
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(true);

  async function checkSessionAndLoad() {
    setLoading(true);
    setErrorText("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/admin/login");
      return;
    }

    await loadQuizzes();
    setLoading(false);
  }

  async function loadQuizzes() {
    const { data, error } = await supabase
      .from("quizzes")
      .select("id, title, status, room_code, current_question_order, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setQuizzes(data ?? []);
  }

  async function createQuiz(e: FormEvent) {
    e.preventDefault();
    setErrorText("");

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorText("Judul quiz tidak boleh kosong.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      navigate("/admin/login");
      return;
    }

    const { error } = await supabase.from("quizzes").insert({
      owner_id: user.id,
      title: cleanTitle,
      status: "waiting",
      room_code: makeRoomCode(),
      current_question_order: 0,
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    setTitle("");
    await loadQuizzes();
  }

  async function startQuiz(quizId: string) {
    setErrorText("");

    const { error } = await supabase
      .from("quizzes")
      .update({
        status: "live",
        current_question_order: 1,
      })
      .eq("id", quizId);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadQuizzes();
  }

  async function finishQuiz(quizId: string) {
    setErrorText("");

    const { error } = await supabase.rpc("finish_quiz", {
      p_quiz_id: quizId,
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadQuizzes();
  }

  async function resetSession(quizId: string) {
    const confirmed = window.confirm(
      "Reset sesi akan menghapus peserta, jawaban, dan log cheating untuk quiz ini. Lanjut?"
    );

    if (!confirmed) return;

    setErrorText("");

    const { error } = await supabase.rpc("reset_quiz_session", {
      p_quiz_id: quizId,
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadQuizzes();
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/");
  }

  useEffect(() => {
    checkSessionAndLoad();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Memuat dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <section className="mx-auto max-w-6xl">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-black">Admin Dashboard</h1>
            <p className="text-slate-300 mt-2">
              Kelola room, soal aktif, dan status quiz.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-slate-800 px-5 py-3 font-bold hover:bg-slate-700"
          >
            Logout
          </button>
        </header>

        <form
          onSubmit={createQuiz}
          className="mb-8 rounded-3xl bg-slate-900 p-6 shadow-xl"
        >
          <h2 className="text-2xl font-black mb-4">Buat Quiz Baru</h2>

          <div className="flex flex-col md:flex-row gap-3">
            <input
              className="flex-1 rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
              placeholder="Contoh: Kuis Presentasi Kelompok 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <button className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700">
              Buat Room
            </button>
          </div>
        </form>

        {errorText && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        <div className="space-y-4">
          {quizzes.length === 0 && (
            <div className="rounded-3xl bg-slate-900 p-8 text-center text-slate-300">
              Belum ada quiz. Buat quiz pertama dulu.
            </div>
          )}

          {quizzes.map((quiz) => {
            const participantLink = `${window.location.origin}${window.location.pathname}#/join/${quiz.room_code}`;

            return (
              <article
                key={quiz.id}
                className="rounded-3xl bg-slate-900 p-6 shadow-xl"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                  <div>
                    <h3 className="text-2xl font-black">{quiz.title}</h3>

                    <p className="text-slate-300 mt-1">
                      Status:{" "}
                      <span className="font-bold text-white">
                        {quiz.status}
                      </span>
                    </p>

                    <p className="text-slate-300">
                      Room Code:{" "}
                      <span className="font-bold text-white">
                        {quiz.room_code}
                      </span>
                    </p>

<p className="text-slate-300">
  Mode:{" "}
  <span className="font-bold text-white">
    Otomatis per peserta
  </span>
</p>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => startQuiz(quiz.id)}
                      className="rounded-2xl bg-green-600 px-5 py-3 font-bold hover:bg-green-700"
                    >
                      Mulai
                    </button>

                    <button
                      onClick={() => finishQuiz(quiz.id)}
                      className="rounded-2xl bg-red-600 px-5 py-3 font-bold hover:bg-red-700"
                    >
                      Selesaikan
                    </button>

                    <button
                      onClick={() => resetSession(quiz.id)}
                      className="rounded-2xl bg-slate-700 px-5 py-3 font-bold hover:bg-slate-600"
                    >
                      Reset Sesi
                    </button>

                    <Link
                      to={`/admin/quiz/${quiz.id}/edit`}
                      className="rounded-2xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-700"
                    >
                      Edit Soal
                    </Link>

                    <Link
                      to={`/join/${quiz.room_code}`}
                      className="rounded-2xl bg-slate-800 px-5 py-3 font-bold hover:bg-slate-700"
                    >
                      Preview Join
                    </Link>
                    <Link
                      to={`/admin/live/${quiz.id}`}
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700"
                    >
                      Live Monitor
                    </Link>
                    <Link
                        to={`/admin/cheating/${quiz.id}`}
                        className="rounded-2xl bg-red-700 px-5 py-3 font-bold hover:bg-red-800"
                    >
                        Anti-Cheating
                    </Link>
                  </div>
                </div>

                <div className="mt-5 rounded-2xl bg-slate-950 p-4">
                  <p className="text-sm text-slate-400 mb-2">Link peserta:</p>
                  <code className="break-all text-purple-300">
                    {participantLink}
                  </code>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}