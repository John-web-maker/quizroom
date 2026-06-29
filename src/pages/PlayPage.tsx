import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { setupAntiCheat } from "../lib/antiCheat";
import { supabase } from "../lib/supabase";

type QuestionRow = {
  quiz_status: string;
  question_id: string;
  order_no: number;
  question_text: string;
  time_limit_seconds: number;
  option_id: string;
  option_text: string;
  option_order: number;
};

type QuizQuestion = {
  id: string;
  orderNo: number;
  text: string;
  timeLimit: number;
  options: {
    id: string;
    text: string;
    order: number;
  }[];
};

export function PlayPage() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [safeMode, setSafeMode] = useState(false);
  const [quizStatus, setQuizStatus] = useState<string>("waiting");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [answering, setAnswering] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [loading, setLoading] = useState(false);

  const transitionLockRef = useRef(false);

  const currentQuestion = questions[currentIndex];

  const progressText = useMemo(() => {
    if (!currentQuestion) return "";
    return `Soal ${currentIndex + 1} dari ${questions.length}`;
  }, [currentQuestion, currentIndex, questions.length]);

  async function enterSafeMode() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      // Browser bisa menolak fullscreen. Tetap lanjut, tapi anti-cheat akan tetap mencatat fullscreen exit.
    }

    setSafeMode(true);
  }

  function buildQuestions(rows: QuestionRow[]) {
    const map = new Map<string, QuizQuestion>();

    for (const row of rows) {
      if (!map.has(row.question_id)) {
        map.set(row.question_id, {
          id: row.question_id,
          orderNo: row.order_no,
          text: row.question_text,
          timeLimit: row.time_limit_seconds,
          options: [],
        });
      }

      map.get(row.question_id)?.options.push({
        id: row.option_id,
        text: row.option_text,
        order: row.option_order,
      });
    }

    return Array.from(map.values())
      .sort((a, b) => a.orderNo - b.orderNo)
      .map((question) => ({
        ...question,
        options: question.options.sort((a, b) => a.order - b.order),
      }));
  }

  async function loadQuiz() {
    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) {
      setMessage("Session peserta tidak ditemukan. Silakan join ulang.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc(
      "get_quiz_questions_for_participant",
      {
        p_participant_id: participantId,
        p_session_token: sessionToken,
      }
    );

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    const rows = (data ?? []) as QuestionRow[];

    if (rows.length === 0) {
      setMessage("Soal belum tersedia. Minta admin membuat soal terlebih dahulu.");
      return;
    }

    setQuizStatus(rows[0].quiz_status);

    const parsedQuestions = buildQuestions(rows);

    setQuestions(parsedQuestions);
    setCurrentIndex(0);
    setSecondsLeft(parsedQuestions[0]?.timeLimit ?? 0);
    setQuestionStart(Date.now());
    setAnswered(false);
    setAnswering(false);
    setTransitioning(false);
    setMessage("");
    transitionLockRef.current = false;
  }

  async function pollQuizStatus() {
    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) return;

    const { data } = await supabase.rpc("get_quiz_questions_for_participant", {
      p_participant_id: participantId,
      p_session_token: sessionToken,
    });

    const rows = (data ?? []) as QuestionRow[];

    if (rows.length > 0) {
      setQuizStatus(rows[0].quiz_status);
    }
  }

  async function submitAnswer(optionId: string) {
    if (!currentQuestion) return;
    if (answered || answering || transitionLockRef.current) return;

    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) return;

    setAnswering(true);

    const answerMs = Date.now() - questionStart;

    const { data, error } = await supabase.rpc("submit_answer", {
      p_participant_id: participantId,
      p_question_id: currentQuestion.id,
      p_option_id: optionId,
      p_answer_ms: answerMs,
      p_session_token: sessionToken,
    });

    setAnswering(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setAnswered(true);

    if (data.already_answered) {
      setMessage("Kamu sudah menjawab soal ini.");
    } else {
      setMessage(
        data.is_correct
          ? `Benar! +${data.points_awarded} poin`
          : "Belum tepat."
      );
    }

    window.setTimeout(() => {
      goToNextQuestion();
    }, 900);
  }

  function goToNextQuestion() {
    if (transitionLockRef.current) return;

    transitionLockRef.current = true;
    setTransitioning(true);

    window.setTimeout(async () => {
      const nextIndex = currentIndex + 1;

      if (nextIndex >= questions.length) {
        await finishParticipant();
        navigate(`/result/${roomCode}`);
        return;
      }

      const nextQuestion = questions[nextIndex];

      setCurrentIndex(nextIndex);
      setSecondsLeft(nextQuestion.timeLimit);
      setQuestionStart(Date.now());
      setAnswered(false);
      setAnswering(false);
      setMessage("");
      setTransitioning(false);
      transitionLockRef.current = false;
    }, 350);
  }

  async function finishParticipant() {
    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) return;

    await supabase.rpc("finish_participant", {
      p_participant_id: participantId,
      p_session_token: sessionToken,
    });
  }

  useEffect(() => {
    if (!safeMode || !roomCode) return;

    const cleanupAntiCheat = setupAntiCheat(roomCode);

    loadQuiz();

    const statusInterval = window.setInterval(() => {
      pollQuizStatus();
    }, 3000);

    return () => {
      cleanupAntiCheat();
      window.clearInterval(statusInterval);
    };
  }, [safeMode, roomCode]);

  useEffect(() => {
    if (!safeMode) return;
    if (!currentQuestion) return;
    if (quizStatus !== "live") return;
    if (answered) return;
    if (transitioning) return;

    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          goToNextQuestion();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    safeMode,
    currentQuestion?.id,
    quizStatus,
    answered,
    transitioning,
    currentIndex,
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
            onClick={loadQuiz}
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

  if (loading || !currentQuestion) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-4xl font-black mb-4">Memuat Soal</h1>

          <p className="text-slate-300">
            Sistem sedang mengambil soal dari database.
          </p>

          {message && (
            <p className="mt-5 text-red-300 font-bold">{message}</p>
          )}
        </section>
      </main>
    );
  }

  const progressPercentage =
    currentQuestion.timeLimit > 0
      ? (secondsLeft / currentQuestion.timeLimit) * 100
      : 0;

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
          {currentQuestion.text}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((option) => (
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