import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: string;
  owner_id: string;
  title: string;
  game_mode: string | null;
  status: string;
  room_code: string | null;
  current_question_order: number | null;
  created_at?: string;
};

type DuplicateQuizResult = {
  quiz_id: string;
  title: string;
  room_code: string;
};

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let i = 0; i < 6; i += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function getBaseUrl() {
  return `${window.location.origin}${window.location.pathname}`;
}

export function AdminDashboardPage() {
  const navigate = useNavigate();

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [title, setTitle] = useState("");
  const [errorText, setErrorText] = useState("");
  const [successText, setSuccessText] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [workingQuizId, setWorkingQuizId] = useState<string | null>(null);

  async function loadQuizzes() {
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

    const { data, error } = await supabase
      .from("quizzes")
      .select(
        "id, owner_id, title, game_mode, status, room_code, current_question_order, created_at"
      )
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorText(error.message);
      setLoading(false);
      return;
    }

    setQuizzes((data ?? []) as Quiz[]);
    setLoading(false);
  }

  async function createQuiz(e: FormEvent) {
    e.preventDefault();

    setErrorText("");
    setSuccessText("");

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setErrorText("Judul quiz wajib diisi.");
      return;
    }

    setCreating(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setCreating(false);
      navigate("/admin/login");
      return;
    }

    const roomCode = generateRoomCode();

    const { error } = await supabase.from("quizzes").insert({
      owner_id: user.id,
      title: cleanTitle,
      room_code: roomCode,
      status: "waiting",
      game_mode: "classic",
      current_question_order: 1,
    });

    setCreating(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setTitle("");
    setSuccessText("Quiz berhasil dibuat.");
    await loadQuizzes();
  }

  async function startQuiz(quizId: string) {
    setErrorText("");
    setSuccessText("");
    setWorkingQuizId(quizId);

    const { error } = await supabase
      .from("quizzes")
      .update({
        status: "live",
        current_question_order: 1,
      })
      .eq("id", quizId);

    setWorkingQuizId(null);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSuccessText("Quiz dimulai. Peserta baru tidak dapat bergabung lagi.");
    await loadQuizzes();
  }

  async function finishQuiz(quizId: string) {
    const confirmed = window.confirm(
      "Selesaikan quiz sekarang? Setelah ini podium final akan ditampilkan."
    );

    if (!confirmed) return;

    setErrorText("");
    setSuccessText("");
    setWorkingQuizId(quizId);

    const { error } = await supabase.rpc("finish_quiz", {
      p_quiz_id: quizId,
    });

    setWorkingQuizId(null);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSuccessText("Quiz berhasil diselesaikan.");
    await loadQuizzes();
  }

  async function resetSession(quizId: string) {
    const confirmed = window.confirm(
      "Reset sesi akan menghapus peserta, jawaban, dan log cheating untuk quiz ini. Lanjut?"
    );

    if (!confirmed) return;

    setErrorText("");
    setSuccessText("");
    setWorkingQuizId(quizId);

    const { error } = await supabase.rpc("reset_quiz_session", {
      p_quiz_id: quizId,
    });

    setWorkingQuizId(null);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSuccessText("Sesi quiz berhasil di-reset.");
    await loadQuizzes();
  }

  async function deleteQuiz(quizId: string, quizTitle: string) {
    const confirmed = window.confirm(
      `Hapus quiz "${quizTitle}" secara permanen? Semua data soal, peserta, jawaban, dan log cheating juga akan dihapus.`
    );

    if (!confirmed) return;

    setErrorText("");
    setSuccessText("");
    setWorkingQuizId(quizId);

    const { error } = await supabase.rpc("delete_quiz", {
      p_quiz_id: quizId,
    });

    setWorkingQuizId(null);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSuccessText("Quiz berhasil dihapus.");
    await loadQuizzes();
  }

  async function duplicateQuiz(quizId: string, quizTitle: string) {
    const confirmed = window.confirm(
      `Duplikat quiz "${quizTitle}"? Sistem akan membuat quiz baru dengan soal dan jawaban yang sama, tetapi room code baru.`
    );

    if (!confirmed) return;

    setErrorText("");
    setSuccessText("");
    setWorkingQuizId(quizId);

    const { data, error } = await supabase.rpc("duplicate_quiz", {
      p_quiz_id: quizId,
    });

    setWorkingQuizId(null);

    if (error) {
      setErrorText(error.message);
      return;
    }

    const result = data as DuplicateQuizResult | null;

    setSuccessText(
      result
        ? `Quiz berhasil diduplikasi: ${result.title} dengan kode ${result.room_code}.`
        : "Quiz berhasil diduplikasi."
    );

    await loadQuizzes();
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/admin/login");
  }

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessText("Berhasil disalin.");
      setErrorText("");
    } catch {
      setErrorText("Gagal menyalin. Copy manual dari teks yang tersedia.");
      setSuccessText("");
    }
  }

  useEffect(() => {
    loadQuizzes();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Memuat dashboard admin...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <section className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col md:flex-row md:items-start md:justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black">Admin Dashboard</h1>

            <p className="text-slate-300 mt-2">
              Kelola room, soal aktif, peserta, dan status quiz.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-2xl bg-slate-800 px-6 py-4 font-bold hover:bg-slate-700"
          >
            Logout
          </button>
        </header>

        {errorText && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        {successText && (
          <div className="mb-6 rounded-2xl bg-green-500/10 border border-green-500/30 p-4 text-green-300">
            {successText}
          </div>
        )}

        <form
          onSubmit={createQuiz}
          className="rounded-3xl bg-slate-900 p-6 mb-8 shadow-xl"
        >
          <h2 className="text-2xl font-black mb-5">Buat Quiz Baru</h2>

          <div className="flex flex-col md:flex-row gap-4">
            <input
              className="flex-1 rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
              placeholder="Contoh: Kuis Presentasi Kelompok 1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />

            <button
              disabled={creating}
              className="rounded-2xl bg-purple-600 px-8 py-4 font-bold hover:bg-purple-700 disabled:opacity-60"
            >
              {creating ? "Membuat..." : "Buat Room"}
            </button>
          </div>
        </form>

        <section className="space-y-5">
          {quizzes.length === 0 && (
            <div className="rounded-3xl bg-slate-900 p-8 text-center text-slate-300">
              Belum ada quiz. Buat quiz pertama dulu.
            </div>
          )}

          {quizzes.map((quiz) => {
            const roomCode = quiz.room_code ?? "-";
            const participantJoinUrl = `${getBaseUrl()}#/join/${roomCode}`;
            const generalJoinUrl = `${getBaseUrl()}#/join`;
            const isWorking = workingQuizId === quiz.id;

            return (
              <article
                key={quiz.id}
                className="rounded-3xl bg-slate-900 p-6 shadow-xl"
              >
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div>
                    <h2 className="text-2xl font-black mb-2">{quiz.title}</h2>

                    <p className="text-slate-300">
                      Status:{" "}
                      <span className="font-bold text-white">
                        {quiz.status}
                      </span>
                    </p>

                    <p className="text-slate-300">
                      Room Code:{" "}
                      <span className="font-bold text-white">{roomCode}</span>
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
                      disabled={isWorking || quiz.status !== "waiting"}
                      className="rounded-2xl bg-green-600 px-5 py-3 font-bold hover:bg-green-700 disabled:opacity-50"
                    >
                      Mulai
                    </button>

                    <button
                      onClick={() => finishQuiz(quiz.id)}
                      disabled={isWorking || quiz.status === "ended"}
                      className="rounded-2xl bg-red-600 px-5 py-3 font-bold hover:bg-red-700 disabled:opacity-50"
                    >
                      Selesaikan
                    </button>

                    <button
                      onClick={() => resetSession(quiz.id)}
                      disabled={isWorking}
                      className="rounded-2xl bg-slate-700 px-5 py-3 font-bold hover:bg-slate-600 disabled:opacity-50"
                    >
                      Reset Sesi
                    </button>

                    <button
                      onClick={() => duplicateQuiz(quiz.id, quiz.title)}
                      disabled={isWorking}
                      className="rounded-2xl bg-indigo-600 px-5 py-3 font-bold hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Duplikat Quiz
                    </button>

                    <Link
                      to={`/admin/quiz/${quiz.id}/edit`}
                      className="rounded-2xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-700"
                    >
                      Edit Soal
                    </Link>

                    <Link
                      to={`/admin/live/${quiz.id}`}
                      className="rounded-2xl bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700"
                    >
                      Live Monitor
                    </Link>

                    <Link
                      to={`/admin/cheating/${quiz.id}`}
                      className="rounded-2xl bg-red-800 px-5 py-3 font-bold hover:bg-red-900"
                    >
                      Anti-Cheating
                    </Link>

                    <Link
                      to={`/join/${roomCode}`}
                      className="rounded-2xl bg-slate-700 px-5 py-3 font-bold hover:bg-slate-600"
                    >
                      Preview Join
                    </Link>

                    <button
                      onClick={() => deleteQuiz(quiz.id, quiz.title)}
                      disabled={isWorking}
                      className="rounded-2xl bg-red-950 px-5 py-3 font-bold hover:bg-red-900 disabled:opacity-50"
                    >
                      Hapus Quiz
                    </button>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-slate-950 p-5">
                  <p className="text-slate-400 mb-2">Kode peserta:</p>

                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <code className="text-3xl font-black text-purple-200">
                      {roomCode}
                    </code>

                    <button
                      onClick={() => copyText(roomCode)}
                      className="rounded-xl bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700"
                    >
                      Copy Kode
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-950 p-5">
                  <p className="text-slate-400 mb-2">Link peserta langsung:</p>

                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <code className="flex-1 break-all text-purple-200">
                      {participantJoinUrl}
                    </code>

                    <button
                      onClick={() => copyText(participantJoinUrl)}
                      className="rounded-xl bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-slate-950 p-5">
                  <p className="text-slate-400 mb-2">
                    Link halaman join umum:
                  </p>

                  <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                    <code className="flex-1 break-all text-purple-200">
                      {generalJoinUrl}
                    </code>

                    <button
                      onClick={() => copyText(generalJoinUrl)}
                      className="rounded-xl bg-slate-800 px-4 py-2 font-bold hover:bg-slate-700"
                    >
                      Copy Link Umum
                    </button>
                  </div>
                </div>

                {quiz.status === "waiting" && (
                  <div className="mt-4 rounded-2xl bg-slate-800/60 border border-slate-700 p-4 text-slate-300">
                    Quiz belum dimulai. Peserta masih dapat bergabung.
                  </div>
                )}

                {quiz.status === "live" && (
                  <div className="mt-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-yellow-200">
                    Quiz sedang berjalan. Peserta baru tidak dapat bergabung.
                  </div>
                )}

                {quiz.status === "ended" && (
                  <div className="mt-4 rounded-2xl bg-green-500/10 border border-green-500/30 p-4 text-green-200">
                    Quiz sudah selesai. Podium dan hasil final sudah tersedia.
                  </div>
                )}
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}