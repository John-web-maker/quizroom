import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: string;
  title: string;
  status: string;
  room_code: string | null;
};

type Participant = {
  id: string;
  display_name: string;
  status: string;
  score: number;
  rank: number | null;
  avg_answer_ms: number | null;
  joined_at: string;
  finished_at: string | null;
};

type Question = {
  id: string;
  order_no: number;
  question_text: string;
};

type Response = {
  participant_id: string;
  question_id: string;
  is_correct: boolean;
  points_awarded: number;
  answer_ms: number;
};

type CheatEvent = {
  id: string;
  participant_id: string;
  event_type: string;
  severity: string;
  created_at: string;
};

function avg(numbers: number[]) {
  if (numbers.length === 0) return null;
  return Math.round(
    numbers.reduce((sum, value) => sum + value, 0) / numbers.length
  );
}

function formatMs(ms: number | null) {
  if (ms === null || ms === undefined) return "-";
  return `${(ms / 1000).toFixed(1)} detik`;
}

export function AdminLiveMonitorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [cheatEvents, setCheatEvents] = useState<CheatEvent[]>([]);

  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(true);

  const [revealedRanks, setRevealedRanks] = useState<number[]>([]);

  const rankedParticipants = useMemo(() => {
    return [...participants].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;

      const avgA = a.avg_answer_ms ?? Number.MAX_SAFE_INTEGER;
      const avgB = b.avg_answer_ms ?? Number.MAX_SAFE_INTEGER;

      if (avgA !== avgB) return avgA - avgB;

      return (
        new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
      );
    });
  }, [participants]);

  const participantRows = useMemo(() => {
    return rankedParticipants.map((participant, index) => {
      const participantResponses = responses.filter(
        (response) => response.participant_id === participant.id
      );

      const correct = participantResponses.filter(
        (response) => response.is_correct
      ).length;

      const wrong = participantResponses.filter(
        (response) => !response.is_correct
      ).length;

      const answerTimes = participantResponses.map(
        (response) => response.answer_ms
      );

      return {
        ...participant,
        liveRank: index + 1,
        answered: participantResponses.length,
        correct,
        wrong,
        unanswered: Math.max(questions.length - participantResponses.length, 0),
        avgMs: participant.avg_answer_ms ?? avg(answerTimes),
      };
    });
  }, [rankedParticipants, responses, questions.length]);

  const questionRows = useMemo(() => {
    return questions.map((question) => {
      const questionResponses = responses.filter(
        (response) => response.question_id === question.id
      );

      const correct = questionResponses.filter(
        (response) => response.is_correct
      ).length;

      const wrong = questionResponses.filter(
        (response) => !response.is_correct
      ).length;

      const avgMs = avg(questionResponses.map((response) => response.answer_ms));

      return {
        ...question,
        answered: questionResponses.length,
        correct,
        wrong,
        unanswered: Math.max(participants.length - questionResponses.length, 0),
        avgMs,
      };
    });
  }, [questions, responses, participants.length]);

  const totalCorrect = responses.filter((response) => response.is_correct).length;
  const totalWrong = responses.filter((response) => !response.is_correct).length;
  const totalPossibleAnswers = participants.length * questions.length;
  const totalUnanswered = Math.max(totalPossibleAnswers - responses.length, 0);

  async function loadData(silent = false) {
    if (!quizId) return;

    if (!silent) {
      setLoading(true);
    }

    setErrorText("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      navigate("/admin/login");
      return;
    }

    const { data: quizData, error: quizError } = await supabase
      .from("quizzes")
      .select("id, title, status, room_code")
      .eq("id", quizId)
      .single();

    if (quizError) {
      setErrorText(quizError.message);
      setLoading(false);
      return;
    }

    const { data: participantData, error: participantError } = await supabase
      .from("participants")
      .select(
        "id, display_name, status, score, rank, avg_answer_ms, joined_at, finished_at"
      )
      .eq("quiz_id", quizId)
      .order("score", { ascending: false });

    if (participantError) {
      setErrorText(participantError.message);
      setLoading(false);
      return;
    }

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("id, order_no, question_text")
      .eq("quiz_id", quizId)
      .order("order_no", { ascending: true });

    if (questionError) {
      setErrorText(questionError.message);
      setLoading(false);
      return;
    }

    const participantIds = (participantData ?? []).map(
      (participant) => participant.id
    );

    let responseData: Response[] = [];
    let cheatData: CheatEvent[] = [];

    if (participantIds.length > 0) {
      const { data: responsesFetched, error: responseError } = await supabase
        .from("responses")
        .select("participant_id, question_id, is_correct, points_awarded, answer_ms")
        .in("participant_id", participantIds);

      if (responseError) {
        setErrorText(responseError.message);
        setLoading(false);
        return;
      }

      const { data: cheatFetched, error: cheatError } = await supabase
        .from("cheat_events")
        .select("id, participant_id, event_type, severity, created_at")
        .eq("quiz_id", quizId)
        .order("created_at", { ascending: false });

      if (cheatError) {
        setErrorText(cheatError.message);
        setLoading(false);
        return;
      }

      responseData = responsesFetched ?? [];
      cheatData = cheatFetched ?? [];
    }

    setQuiz(quizData);
    setParticipants(participantData ?? []);
    setQuestions(questionData ?? []);
    setResponses(responseData);
    setCheatEvents(cheatData);
    setLoading(false);
  }

  async function startQuiz() {
    if (!quizId) return;

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

    await loadData();
  }

  async function finishQuiz() {
    if (!quizId) return;

    const confirmed = window.confirm(
      "Selesaikan kuis sekarang? Setelah ini podium final akan ditampilkan."
    );

    if (!confirmed) return;

    setErrorText("");

    const { error } = await supabase.rpc("finish_quiz", {
      p_quiz_id: quizId,
    });

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadData();
  }

  async function resetSession() {
    if (!quizId) return;

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

    setRevealedRanks([]);
    await loadData();
  }

  useEffect(() => {
    loadData();

    const intervalId = window.setInterval(() => {
      loadData(true);
    }, 2500);

    return () => window.clearInterval(intervalId);
  }, [quizId]);

  useEffect(() => {
    if (quiz?.status !== "ended") {
      setRevealedRanks([]);
      return;
    }

    setRevealedRanks([]);

    const t1 = window.setTimeout(() => {
      setRevealedRanks([3]);
    }, 500);

    const t2 = window.setTimeout(() => {
      setRevealedRanks([3, 2]);
    }, 1600);

    const t3 = window.setTimeout(() => {
      setRevealedRanks([3, 2, 1]);
    }, 2800);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [quiz?.status]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Memuat live monitor...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <section className="mx-auto max-w-7xl">
        <Link to="/admin" className="text-purple-300 underline">
          ← Kembali ke Dashboard
        </Link>

        <header className="mt-6 mb-8 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
          <div>
            <h1 className="text-4xl font-black">Live Monitor</h1>

            <p className="text-slate-300 mt-2">
              Quiz: <span className="font-bold text-white">{quiz?.title}</span>
            </p>

            <p className="text-slate-300">
              Room:{" "}
              <span className="font-bold text-white">{quiz?.room_code}</span>{" "}
              · Status:{" "}
              <span className="font-bold text-white">{quiz?.status}</span>
            </p>

            {quiz?.status !== "ended" && (
              <p className="text-slate-400 mt-2">
                Podium akan muncul setelah admin menekan tombol Selesaikan.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={startQuiz}
              className="rounded-2xl bg-green-600 px-5 py-3 font-bold hover:bg-green-700"
            >
              Mulai
            </button>

            <button
              onClick={finishQuiz}
              className="rounded-2xl bg-red-600 px-5 py-3 font-bold hover:bg-red-700"
            >
              Selesaikan
            </button>

            <button
              onClick={resetSession}
              className="rounded-2xl bg-slate-700 px-5 py-3 font-bold hover:bg-slate-600"
            >
              Reset Sesi
            </button>

            <Link
              to={`/admin/cheating/${quizId}`}
              className="rounded-2xl bg-red-800 px-5 py-3 font-bold hover:bg-red-900"
            >
              Anti-Cheating
            </Link>

            <Link
              to={`/admin/quiz/${quizId}/edit`}
              className="rounded-2xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-700"
            >
              Edit Soal
            </Link>
          </div>
        </header>

        {errorText && (
          <div className="mb-6 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
            {errorText}
          </div>
        )}

        {quiz?.status === "ended" && (
          <section className="rounded-[2rem] bg-slate-900 p-6 mb-8 overflow-hidden">
            <div className="text-center mb-8">
              <p className="inline-flex rounded-full bg-purple-500/20 px-5 py-2 text-purple-200 font-bold mb-4">
                Kuis Selesai
              </p>

              <h2 className="text-4xl md:text-6xl font-black">
                Podium Juara
              </h2>

              <p className="text-slate-300 mt-3">
                Pemenang ditampilkan dari peringkat 3 hingga peringkat 1.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              {[3, 2, 1].map((rank) => {
                const participant = participantRows.find(
                  (row) => row.liveRank === rank
                );

                const visible = revealedRanks.includes(rank);

                return (
                  <div
                    key={rank}
                    className={[
                      "rounded-[2rem] p-8 text-center border transition-all duration-700",
                      visible
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-75 translate-y-12",
                      rank === 1
                        ? "bg-yellow-400/20 border-yellow-300/60 md:min-h-[340px]"
                        : rank === 2
                        ? "bg-slate-700/50 border-slate-300/40 md:min-h-[285px]"
                        : "bg-orange-500/20 border-orange-300/50 md:min-h-[245px]",
                    ].join(" ")}
                  >
                    <div className="text-7xl mb-5">
                      {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉"}
                    </div>

                    <p className="text-slate-300 mb-2">Juara {rank}</p>

                    <p className="text-4xl font-black mb-3">
                      {participant?.display_name ?? "-"}
                    </p>

                    <p className="text-xl text-slate-200">
                      {participant?.score ?? 0} poin
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Peserta</p>
            <p className="text-3xl font-black">{participants.length}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Jawaban Masuk</p>
            <p className="text-3xl font-black">{responses.length}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Benar</p>
            <p className="text-3xl font-black text-green-300">
              {totalCorrect}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Salah</p>
            <p className="text-3xl font-black text-red-300">{totalWrong}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Belum Dijawab</p>
            <p className="text-3xl font-black text-yellow-300">
              {totalUnanswered}
            </p>
          </div>
        </section>

        <section className="rounded-3xl bg-slate-900 p-6 mb-8 overflow-x-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-2xl font-black">Live Peserta</h2>
              <p className="text-slate-300 mt-1">
                Ranking sementara dihitung dari skor, lalu rata-rata waktu
                menjawab.
              </p>
            </div>

            <Link
              to={`/admin/cheating/${quizId}`}
              className="rounded-2xl bg-red-800 px-5 py-3 font-bold hover:bg-red-900"
            >
              Buka Anti-Cheating Monitor
            </Link>
          </div>

          <table className="w-full text-left min-w-[900px]">
            <thead className="text-slate-400">
              <tr>
                <th className="p-3">Rank</th>
                <th className="p-3">Nama</th>
                <th className="p-3">Status</th>
                <th className="p-3">Skor</th>
                <th className="p-3">Benar</th>
                <th className="p-3">Salah</th>
                <th className="p-3">Tidak dijawab</th>
                <th className="p-3">Terjawab</th>
                <th className="p-3">Avg waktu</th>
              </tr>
            </thead>

            <tbody>
              {participantRows.length === 0 && (
                <tr>
                  <td className="p-3 text-slate-300" colSpan={9}>
                    Belum ada peserta.
                  </td>
                </tr>
              )}

              {participantRows.map((participant) => (
                <tr key={participant.id} className="border-t border-slate-800">
                  <td className="p-3 font-bold">#{participant.liveRank}</td>
                  <td className="p-3 font-bold">{participant.display_name}</td>
                  <td className="p-3">{participant.status}</td>
                  <td className="p-3">{participant.score}</td>
                  <td className="p-3 text-green-300">{participant.correct}</td>
                  <td className="p-3 text-red-300">{participant.wrong}</td>
                  <td className="p-3 text-yellow-300">
                    {participant.unanswered}
                  </td>
                  <td className="p-3">{participant.answered}</td>
                  <td className="p-3">{formatMs(participant.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-3xl bg-slate-900 p-6 mb-8 overflow-x-auto">
          <h2 className="text-2xl font-black mb-5">Analisis Per Soal</h2>

          <table className="w-full text-left min-w-[850px]">
            <thead className="text-slate-400">
              <tr>
                <th className="p-3">No</th>
                <th className="p-3">Soal</th>
                <th className="p-3">Terjawab</th>
                <th className="p-3">Benar</th>
                <th className="p-3">Salah</th>
                <th className="p-3">Tidak dijawab</th>
                <th className="p-3">Avg waktu</th>
              </tr>
            </thead>

            <tbody>
              {questionRows.length === 0 && (
                <tr>
                  <td className="p-3 text-slate-300" colSpan={7}>
                    Belum ada soal.
                  </td>
                </tr>
              )}

              {questionRows.map((question) => (
                <tr key={question.id} className="border-t border-slate-800">
                  <td className="p-3">{question.order_no}</td>
                  <td className="p-3 font-bold">{question.question_text}</td>
                  <td className="p-3">{question.answered}</td>
                  <td className="p-3 text-green-300">{question.correct}</td>
                  <td className="p-3 text-red-300">{question.wrong}</td>
                  <td className="p-3 text-yellow-300">{question.unanswered}</td>
                  <td className="p-3">{formatMs(question.avgMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="rounded-3xl bg-slate-900 p-6">
          <h2 className="text-2xl font-black mb-3">Anti-Cheating</h2>

          <p className="text-slate-300 mb-5">
            Detail anti-cheating dipisahkan dari live monitor utama. Total log
            saat ini:{" "}
            <span className="font-bold text-red-300">
              {cheatEvents.length}
            </span>
            .
          </p>

          <Link
            to={`/admin/cheating/${quizId}`}
            className="inline-block rounded-2xl bg-red-800 px-5 py-3 font-bold hover:bg-red-900"
          >
            Buka Halaman Anti-Cheating
          </Link>
        </section>
      </section>
    </main>
  );
}