import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ResultRow = {
  quiz_status: string;
  participant_name: string;
  score: number;
  participant_rank: number;
  total_participants: number;
  avg_answer_ms: number | null;
  question_order: number;
  question_text: string;
  selected_option_text: string | null;
  correct_option_text: string | null;
  is_correct: boolean | null;
  points_awarded: number;
  answer_ms: number | null;
};

type PodiumRow = {
  display_name: string;
  score: number;
  participant_rank: number;
};

function formatMs(ms: number | null) {
  if (ms === null || ms === undefined) return "-";
  return `${(ms / 1000).toFixed(1)} detik`;
}

export function ResultPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [podium, setPodium] = useState<PodiumRow[]>([]);
  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(true);

  const [revealedRanks, setRevealedRanks] = useState<number[]>([]);
  const [showPodiumOverlay, setShowPodiumOverlay] = useState(false);
  const [hasShownPodium, setHasShownPodium] = useState(false);

  const summary = rows[0];
  const quizEnded = summary?.quiz_status === "ended";

  const stats = useMemo(() => {
    const answered = rows.filter((row) => row.selected_option_text !== null);
    const correct = rows.filter((row) => row.is_correct === true);
    const wrong = rows.filter((row) => row.is_correct === false);
    const unanswered = rows.filter((row) => row.selected_option_text === null);

    return {
      answered: answered.length,
      correct: correct.length,
      wrong: wrong.length,
      unanswered: unanswered.length,
      total: rows.length,
    };
  }, [rows]);

  async function loadResult(silent = false) {
    if (!silent) {
      setLoading(true);
    }

    setErrorText("");

    const participantId = sessionStorage.getItem("participant_id");
    const sessionToken = sessionStorage.getItem("session_token");

    if (!participantId || !sessionToken) {
      setErrorText("Session peserta tidak ditemukan. Silakan join ulang.");
      setLoading(false);
      return;
    }

    const { data: resultData, error: resultError } = await supabase.rpc(
      "get_participant_result",
      {
        p_participant_id: participantId,
        p_session_token: sessionToken,
      }
    );

    if (resultError) {
      setErrorText(resultError.message);
      setLoading(false);
      return;
    }

    const { data: podiumData, error: podiumError } = await supabase.rpc(
      "get_podium_for_participant",
      {
        p_participant_id: participantId,
        p_session_token: sessionToken,
      }
    );

    if (podiumError) {
      setErrorText(podiumError.message);
      setLoading(false);
      return;
    }

    setRows((resultData ?? []) as ResultRow[]);
    setPodium((podiumData ?? []) as PodiumRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadResult();

    const intervalId = window.setInterval(() => {
      loadResult(true);
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (!quizEnded) return;
    if (hasShownPodium) return;

    setShowPodiumOverlay(true);
    setRevealedRanks([]);
    setHasShownPodium(true);

    const t1 = window.setTimeout(() => {
      setRevealedRanks([3]);
    }, 500);

    const t2 = window.setTimeout(() => {
      setRevealedRanks([3, 2]);
    }, 1700);

    const t3 = window.setTimeout(() => {
      setRevealedRanks([3, 2, 1]);
    }, 3000);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [quizEnded, hasShownPodium]);

  function closePodiumOverlay() {
    setShowPodiumOverlay(false);

    window.setTimeout(() => {
      document.getElementById("review")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Memuat hasil...</p>
      </main>
    );
  }

  if (errorText) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center">
          <h1 className="text-3xl font-black mb-4">Hasil tidak tersedia</h1>

          <p className="text-red-300 mb-6">{errorText}</p>

          <Link
            to="/"
            className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
          >
            Kembali
          </Link>
        </section>
      </main>
    );
  }

  if (!summary) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center">
          <h1 className="text-3xl font-black mb-4">Belum ada hasil</h1>

          <p className="text-slate-300 mb-6">
            Jawaban peserta belum tersedia.
          </p>

          <Link
            to="/"
            className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
          >
            Kembali
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      {quizEnded && showPodiumOverlay && (
        <section className="fixed inset-0 z-50 bg-slate-950 text-white p-6 overflow-y-auto">
          <div className="mx-auto max-w-6xl min-h-screen flex flex-col justify-center">
            <div className="text-center mb-10">
              <p className="inline-flex rounded-full bg-purple-500/20 px-5 py-2 text-purple-200 font-bold mb-5">
                Kuis Selesai
              </p>

              <h1 className="text-5xl md:text-7xl font-black">
                Podium Juara
              </h1>

              <p className="text-slate-300 mt-4">
                Pemenang ditampilkan berurutan dari Juara 3 hingga Juara 1.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
              {[3, 2, 1].map((rank) => {
                const item = podium.find(
                  (podiumItem) => podiumItem.participant_rank === rank
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
                      {item?.display_name ?? "-"}
                    </p>

                    <p className="text-xl text-slate-200">
                      {item?.score ?? 0} poin
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="text-center mt-10">
              <button
                onClick={closePodiumOverlay}
                className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
              >
                Lihat Review Jawaban
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-4xl font-black">Hasil Kuis</h1>

          <p className="text-slate-300 mt-2">
            Review skor, ranking, dan jawaban kamu.
          </p>

          {!quizEnded && (
            <div className="mt-5 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-yellow-200">
              Kuis belum diselesaikan oleh admin. Podium final belum tersedia.
              Hasil di bawah ini adalah hasil sementara.
            </div>
          )}

          {quizEnded && !showPodiumOverlay && (
            <div className="mt-5 rounded-2xl bg-green-500/10 border border-green-500/30 p-4 text-green-200">
              Kuis telah diselesaikan oleh admin. Ranking dan podium sudah
              final.
            </div>
          )}
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400 mb-2">Nama</p>
            <p className="text-2xl font-black">{summary.participant_name}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400 mb-2">Skor</p>
            <p className="text-2xl font-black">{summary.score ?? 0}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400 mb-2">Ranking</p>
            <p className="text-2xl font-black">
              #{summary.participant_rank ?? "-"} dari{" "}
              {summary.total_participants ?? "-"}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400 mb-2">Rata-rata waktu</p>
            <p className="text-2xl font-black">
              {formatMs(summary.avg_answer_ms ?? null)}
            </p>
          </div>
        </section>

        {quizEnded ? (
          <section className="rounded-3xl bg-slate-900 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
              <div>
                <h2 className="text-2xl font-black">Podium Final</h2>
                <p className="text-slate-300 mt-1">
                  Ranking final setelah admin menyelesaikan kuis.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowPodiumOverlay(true);
                  setRevealedRanks([]);

                  window.setTimeout(() => setRevealedRanks([3]), 300);
                  window.setTimeout(() => setRevealedRanks([3, 2]), 1400);
                  window.setTimeout(() => setRevealedRanks([3, 2, 1]), 2600);
                }}
                className="rounded-2xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-700"
              >
                Putar Ulang Podium
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[3, 2, 1].map((rank) => {
                const item = podium.find(
                  (podiumItem) => podiumItem.participant_rank === rank
                );

                return (
                  <div
                    key={rank}
                    className={[
                      "rounded-3xl p-6 text-center border",
                      rank === 1
                        ? "bg-yellow-400/20 border-yellow-300/50"
                        : rank === 2
                        ? "bg-slate-700/50 border-slate-400/40"
                        : "bg-orange-500/20 border-orange-300/40",
                    ].join(" ")}
                  >
                    <div className="text-5xl mb-4">
                      {rank === 1 ? "🏆" : rank === 2 ? "🥈" : "🥉"}
                    </div>

                    <p className="text-slate-300 mb-2">Juara {rank}</p>

                    <p className="text-3xl font-black mb-2">
                      {item?.display_name ?? "-"}
                    </p>

                    <p className="text-slate-300">
                      {item?.score ?? 0} poin
                    </p>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="rounded-3xl bg-slate-900 p-6 mb-8">
            <h2 className="text-2xl font-black mb-3">
              Podium Belum Tersedia
            </h2>

            <p className="text-slate-300">
              Podium akan muncul setelah admin menekan tombol{" "}
              <span className="font-bold text-white">Selesaikan</span>.
            </p>
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Benar</p>
            <p className="text-3xl font-black text-green-300">
              {stats.correct}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Salah</p>
            <p className="text-3xl font-black text-red-300">{stats.wrong}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Tidak dijawab</p>
            <p className="text-3xl font-black text-yellow-300">
              {stats.unanswered}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-5">
            <p className="text-slate-400">Total soal</p>
            <p className="text-3xl font-black">{stats.total}</p>
          </div>
        </section>

        <section id="review" className="space-y-4 mb-8">
          <h2 className="text-2xl font-black">Review Jawaban</h2>

          {rows.map((row) => (
            <article
              key={row.question_order}
              className="rounded-3xl bg-slate-900 p-6"
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <h3 className="text-xl font-black">
                  {row.question_order}. {row.question_text}
                </h3>

                <span
                  className={[
                    "rounded-full px-4 py-2 text-sm font-bold",
                    row.is_correct === true
                      ? "bg-green-500/20 text-green-300"
                      : row.is_correct === false
                      ? "bg-red-500/20 text-red-300"
                      : "bg-yellow-500/20 text-yellow-300",
                  ].join(" ")}
                >
                  {row.is_correct === true
                    ? "Benar"
                    : row.is_correct === false
                    ? "Salah"
                    : "Tidak dijawab"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-slate-300">
                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-slate-400 mb-1">Jawaban kamu</p>
                  <p className="font-bold text-white">
                    {row.selected_option_text ?? "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-slate-400 mb-1">Jawaban benar</p>
                  <p className="font-bold text-white">
                    {row.correct_option_text ?? "-"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-800 p-4">
                  <p className="text-slate-400 mb-1">Waktu / poin</p>
                  <p className="font-bold text-white">
                    {formatMs(row.answer_ms)} · {row.points_awarded} poin
                  </p>
                </div>
              </div>
            </article>
          ))}
        </section>

        <Link
          to="/thanks"
          className="inline-block rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
        >
          Keluar dari Permainan
        </Link>
      </section>
    </main>
  );
}