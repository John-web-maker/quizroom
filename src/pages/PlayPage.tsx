import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { setupAntiCheat } from "../lib/antiCheat";
import { supabase } from "../lib/supabase";

type ActiveQuestionRow = {
  quiz_status: string;
  participant_status: string;
  current_question_position: number;
  total_questions: number;
  question_started_at: string | null;
  question_id: string | null;
  question_text: string | null;
  time_limit_seconds: number | null;
  option_id: string | null;
  option_text: string | null;
  option_order: number | null;
};

type Option = {
  id: string;
  text: string;
  order: number;
};

export function PlayPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [safeMode, setSafeMode] = useState(false);
  const [rows, setRows] = useState<ActiveQuestionRow[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [message, setMessage] = useState("");
  const [answering, setAnswering] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [loading, setLoading] = useState(false);

  const advanceLockRef = useRef(false);

  const firstRow = rows[0];

  const options = useMemo<Option[]>(() => {
    return rows
      .filter((row) => row.option_id && row.option_text)
      .map((row) => ({
        id: row.option_id as string,
        text: row.option_text as string,
        order: row.option_order ?? 0,
      }))
      .sort((a, b) => a.order - b.order);
  }, [rows]);

  const questionId = firstRow?.question_id ?? null;
  const questionText = firstRow?.question_text ?? "";
  const quizStatus = firstRow?.quiz_status ?? "waiting";
  const participantStatus = firstRow?.participant_status ?? "waiting";
  const totalQuestions = firstRow?.total_questions ?? 0;
  const currentPosition = firstRow?.current_question_position ?? 1;
  const timeLimit = firstRow?.time_limit_seconds ?? 0;
  const questionStartedAt = firstRow?.question_started_at ?? null;

  const progressText =
    questionId && totalQuestions > 0
      ? `Soal ${currentPosition} dari ${totalQuestions}`
      : "";

  function computeSecondsLeft(startedAt: string | null, limit: number | null) {
    if (!startedAt || !limit) return 0;

    const startedMs = new Date(startedAt).getTime();
    const endMs = startedMs + limit * 1000;
    const remaining = Math.ceil((endMs - Date.now()) / 1000);

    return Math.max(remaining, 0);
  }

  async function enterSafeMode() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Jika browser menolak fullscreen, kuis tetap lanjut.
    }

    setSafeMode(true);
  }

  async function loadActiveQuestion(silent = false) {
    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) {
      setMessage("Session peserta tidak ditemukan. Silakan join ulang.");
      return;
    }

    if (!silent) {
      setLoading(true);
    }

    const { data, error } = await supabase.rpc(
      "get_active_question_for_participant",
      {
        p_participant_id: participantId,
        p_session_token: sessionToken,
      }
    );

    if (!silent) {
      setLoading(false);
    }

    if (error) {
      setMessage(error.message);
      return;
    }

    const nextRows = (data ?? []) as ActiveQuestionRow[];

    setRows(nextRows);

    const nextFirstRow = nextRows[0];

    if (!nextFirstRow) {
      setMessage("Soal belum tersedia.");
      return;
    }

    if (nextFirstRow.quiz_status === "ended") {
      navigate(`/result/${roomCode}`);
      return;
    }

    if (
      nextFirstRow.participant_status === "finished" ||
      (nextFirstRow.quiz_status === "live" && !nextFirstRow.question_id)
    ) {
      navigate(`/result/${roomCode}`);
      return;
    }

    if (nextFirstRow.question_id) {
      setSecondsLeft(
        computeSecondsLeft(
          nextFirstRow.question_started_at,
          nextFirstRow.time_limit_seconds
        )
      );

      setAnswered(false);
      setAnswering(false);
      setMessage("");
      advanceLockRef.current = false;
    }
  }

  async function submitAnswer(optionId: string) {
    if (!questionId) return;
    if (answered || answering || advanceLockRef.current) return;

    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) {
      setMessage("Session peserta tidak ditemukan. Silakan join ulang.");
      return;
    }

    setAnswering(true);

    const { data, error } = await supabase.rpc("submit_answer", {
      p_participant_id: participantId,
      p_question_id: questionId,
      p_option_id: optionId,
      p_answer_ms: 0,
      p_session_token: sessionToken,
    });

    setAnswering(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAnswered(true);
    advanceLockRef.current = true;

    if (data.already_answered) {
      setMessage("Kamu sudah menjawab soal ini.");
    } else {
      setMessage("Jawaban tersimpan. Lanjut ke soal berikutnya...");
    }

    window.setTimeout(async () => {
      if (data.completed) {
        navigate(`/result/${roomCode}`);
        return;
      }

      setTransitioning(true);

      window.setTimeout(async () => {
        await loadActiveQuestion();
        setTransitioning(false);
      }, 300);
    }, 900);
  }

  async function skipQuestionBecauseTimeIsUp() {
    if (advanceLockRef.current) return;

    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) {
      setMessage("Session peserta tidak ditemukan. Silakan join ulang.");
      return;
    }

    advanceLockRef.current = true;
    setMessage("Waktu habis. Lanjut ke soal berikutnya...");

    const { data, error } = await supabase.rpc("skip_current_question", {
      p_participant_id: participantId,
      p_session_token: sessionToken,
    });

    if (error) {
      advanceLockRef.current = false;
      setMessage(error.message);
      return;
    }

    window.setTimeout(async () => {
      if (data.completed) {
        navigate(`/result/${roomCode}`);
        return;
      }

      setTransitioning(true);

      window.setTimeout(async () => {
        await loadActiveQuestion();
        setTransitioning(false);
      }, 300);
    }, 500);
  }

  useEffect(() => {
    if (!safeMode || !roomCode) return;

    const cleanupAntiCheat = setupAntiCheat(roomCode);

    loadActiveQuestion();

    const pollId = window.setInterval(() => {
      if (!answering && !answered && !transitioning) {
        loadActiveQuestion(true);
      }
    }, 3000);

    return () => {
      cleanupAntiCheat();
      window.clearInterval(pollId);
    };
  }, [safeMode, roomCode, answering, answered, transitioning]);

  useEffect(() => {
    if (!safeMode) return;
    if (quizStatus !== "live") return;
    if (!questionId) return;
    if (!questionStartedAt) return;
    if (answered) return;
    if (transitioning) return;

    const timerId = window.setInterval(() => {
      const nextSecondsLeft = computeSecondsLeft(questionStartedAt, timeLimit);

      setSecondsLeft(nextSecondsLeft);

      if (nextSecondsLeft <= 0) {
        window.clearInterval(timerId);
        skipQuestionBecauseTimeIsUp();
      }
    }, 300);

    return () => window.clearInterval(timerId);
  }, [
    safeMode,
    quizStatus,
    questionId,
    questionStartedAt,
    timeLimit,
    answered,
    transitioning,
  ]);

  if (!safeMode) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 shadow-xl">
          <h1 className="text-3xl font-black mb-4">Mode Aman Kuis</h1>

          <p className="text-slate-300 mb-4">
            Sebelum kuis dimulai, sistem akan mencatat indikasi pindah tab,
            keluar fullscreen, membuka multi-tab, dan ukuran layar mencurigakan.
          </p>

          <p className="text-slate-300 mb-6">
            Sistem tidak menggunakan kamera, mikrofon, GPS, atau rekaman layar.
          </p>

          <button
            onClick={enterSafeMode}
            className="w-full rounded-2xl bg-purple-600 py-4 font-bold hover:bg-purple-700"
          >
            Saya Setuju dan Masuk Mode Aman
          </button>
        </section>
      </main>
    );
  }

  if (quizStatus === "ended") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <div className="text-6xl mb-5">🏁</div>

          <h1 className="text-4xl font-black mb-4">Kuis Diakhiri Admin</h1>

          <p className="text-slate-300 mb-8">
            Admin telah menyelesaikan kuis. Jawaban yang sudah masuk tetap
            tersimpan.
          </p>

          <button
            onClick={() => navigate(`/result/${roomCode}`)}
            className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
          >
            Lihat Hasil
          </button>
        </section>
      </main>
    );
  }

  if (quizStatus !== "live") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-4xl font-black mb-4">Menunggu Kuis Dimulai</h1>

          <p className="text-slate-300 mb-6">
            Admin belum membuka kuis. Tetap di halaman ini.
          </p>

          <button
            onClick={() => loadActiveQuestion()}
            className="rounded-2xl bg-slate-700 px-6 py-3 font-bold hover:bg-slate-600"
          >
            Muat Ulang
          </button>

          {message && (
            <p className="mt-5 text-red-300 font-bold">{message}</p>
          )}
        </section>
      </main>
    );
  }

  if (loading || participantStatus === "finished") {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-4xl font-black mb-4">Memuat Soal</h1>

          <p className="text-slate-300">
            Sistem sedang mengambil soal aktif dari database.
          </p>
        </section>
      </main>
    );
  }

  if (!questionId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-4xl font-black mb-4">Soal Tidak Tersedia</h1>

          <p className="text-slate-300 mb-6">
            Admin belum membuat soal atau peserta sudah menyelesaikan seluruh
            soal.
          </p>

          <button
            onClick={() => navigate(`/result/${roomCode}`)}
            className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
          >
            Lihat Hasil
          </button>
        </section>
      </main>
    );
  }

  const progressPercentage =
    timeLimit > 0 ? (secondsLeft / timeLimit) * 100 : 0;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
      <section
        className={[
          "max-w-3xl w-full rounded-3xl bg-slate-900 p-8 shadow-xl transition-all duration-300",
          transitioning
            ? "opacity-0 scale-95 translate-y-4"
            : "opacity-100 scale-100 translate-y-0",
        ].join(" ")}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400">Room: {roomCode}</p>

          <p className="rounded-full bg-purple-500/20 px-4 py-2 text-purple-200 font-bold">
            {secondsLeft}s
          </p>
        </div>

        <div className="mb-6 h-3 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-purple-500 transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <p className="text-slate-400 mb-3">{progressText}</p>

        <h1 className="text-3xl md:text-4xl font-black mb-8">
          {questionText}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {options.map((option) => (
            <button
              key={option.id}
              disabled={answered || answering}
              onClick={() => submitAnswer(option.id)}
              className="rounded-3xl bg-purple-600 p-6 text-xl font-bold hover:bg-purple-700 active:scale-95 transition disabled:opacity-60"
            >
              {option.text}
            </button>
          ))}
        </div>

        {message && (
          <div className="mt-8 rounded-2xl bg-slate-800 p-5">
            <p className="font-bold">{message}</p>
          </div>
        )}
      </section>
    </main>
  );
}