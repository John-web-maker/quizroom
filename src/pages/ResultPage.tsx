import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

type ResultRow = {
  quiz_status: string;
  participant_name: string;
  score: number;
  participant_rank: number | null;
  total_participants: number | null;
  avg_answer_ms: number | null;
  question_order: number | null;
  question_text: string | null;
  selected_option_text: string | null;
  correct_option_text: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
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

  const summary = rows[0] ?? null;
  const quizEnded = summary?.quiz_status === "ended";

  const reviewRows = useMemo(() => {
    return rows.filter(
      (row) =>
        row.question_order !== null &&
        row.question_order !== undefined &&
        Boolean(row.question_text)
    );
  }, [rows]);

  const podiumRanks = useMemo(() => {
    return [...podium].sort(
      (a, b) => b.participant_rank - a.participant_rank
    );
  }, [podium]);

  const podiumReady = quizEnded && podiumRanks.length > 0;

  const stats = useMemo(() => {
    const answered = reviewRows.filter(
      (row) => row.selected_option_text !== null
    );

    const correct = reviewRows.filter((row) => row.is_correct === true);
    const wrong = reviewRows.filter((row) => row.is_correct === false);

    const unanswered = reviewRows.filter(
      (row) => row.selected_option_text === null
    );

    return {
      answered: answered.length,
      correct: correct.length,
      wrong: wrong.length,
      unanswered: unanswered.length,
      total: reviewRows.length,
    };
  }, [reviewRows]);

  const startPodiumAnimation = useCallback(
    function startPodiumAnimation() {
      if (!podiumReady) return;

      setShowPodiumOverlay(true);
      setRevealedRanks([]);

      const ranksToReveal = podiumRanks.map((item) => item.participant_rank);

      ranksToReveal.forEach((rank, index) => {
        window.setTimeout(() => {
          setRevealedRanks((current) =>
            current.includes(rank) ? current : [...current, rank]
          );
        }, 500 + index * 900);
      });
    },
    [podiumReady, podiumRanks]
  );

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

    const nextRows = (resultData ?? []) as ResultRow[];
    const nextSummary = nextRows[0] ?? null;
    const nextQuizEnded = nextSummary?.quiz_status === "ended";

    const { data: podiumData, error: podiumError } = await supabase.rpc(
      "get_podium_for_participant",
      {
        p_participant_id: participantId,
        p_session_token: sessionToken,
      }
    );

    if (podiumError && nextQuizEnded) {
      setErrorText(podiumError.message);
      setLoading(false);
      return;
    }

    setRows(nextRows);
    setPodium(podiumError ? [] : ((podiumData ?? []) as PodiumRow[]));
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
    if (!podiumReady) return;
    if (hasShownPodium) return;

    setHasShownPodium(true);
    startPodiumAnimation();
  }, [podiumReady, hasShownPodium, startPodiumAnimation]);

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
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-slate-300">Memuat hasil...</p>
      </main>
    );
  }

  if (errorText) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-4xl font-black mb-4">Hasil tidak tersedia</h1>

          <p className="text-red-300 mb-8">{errorText}</p>

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
        <section className="max-w-xl rounded-3xl bg-slate-900 p-8 text-center shadow-xl">
          <h1 className="text-4xl font-black mb-4">Belum ada hasil</h1>

          <p className="text-slate-300 mb-8">
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
      {podiumReady && showPodiumOverlay && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur flex items-center justify-center p-6">
          <section className="w-full max-w-4xl rounded-3xl bg-slate-900 p-8 shadow-2xl border border-purple-500/30">
            <div className="text-center mb-8">
              <p className="text-purple-200 font-bold mb-2">Kuis Selesai</p>

              <h1 className="text-5xl font-black mb-3">Podium Juara</h1>

              <p className="text-slate-300">
                Pemenang ditampilkan berdasarkan ranking final yang tersedia.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              {podiumRanks.map((item) => {
                const visible = revealedRanks.includes(item.participant_rank);

                return (
                  <div
                    key={item.participant_rank}
                    className={[
                      "rounded-3xl border border-purple-500/30 bg-slate-950 p-6 text-center transition-all duration-500",
                      visible
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-6 scale-95",
                      item.participant_rank === 1
                        ? "md:order-2 md:min-h-[260px]"
                        : item.participant_rank === 2
                        ? "md:order-1 md:min-h-[220px]"
                        : "md:order-3 md:min-h-[190px]",
                    ].join(" ")}
                  >
                    <div className="text-5xl mb-4">
                      {item.participant_rank === 1
                        ? "🥇"
                        : item.participant_rank === 2
                        ? "🥈"
                        : item.participant_rank === 3
                        ? "🥉"
                        : "🏅"}
                    </div>

                    <p className="text-slate-400">
                      Juara {item.participant_rank}
                    </p>

                    <h2 className="text-2xl font-black mt-2">
                      {item.display_name}
                    </h2>

                    <p className="mt-3 text-purple-200 font-bold">
                      {item.score} poin
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={closePodiumOverlay}
                className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
              >
                Lihat Review Jawaban
              </button>
            </div>
          </section>
        </div>
      )}

      <section className="mx-auto max-w-5xl">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-black mb-3">Hasil Kuis</h1>

          <p className="text-slate-300">
            Review skor, ranking, dan jawaban kamu.
          </p>
        </header>

        {!quizEnded && (
          <div className="mb-6 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 p-4 text-yellow-200">
            Kuis belum diselesaikan oleh admin. Podium final dan review kunci
            jawaban baru dibuka setelah admin menekan tombol Selesaikan.
          </div>
        )}

        {quizEnded && (
          <div className="mb-6 rounded-2xl bg-green-500/10 border border-green-500/30 p-4 text-green-200">
            Kuis telah diselesaikan oleh admin. Ranking, podium, dan review
            jawaban sudah final.
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Nama</p>
            <p className="text-2xl font-black mt-2">
              {summary.participant_name}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Skor</p>
            <p className="text-2xl font-black mt-2">{summary.score ?? 0}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Ranking</p>
            <p className="text-2xl font-black mt-2">
              #{summary.participant_rank ?? "-"} dari{" "}
              {summary.total_participants ?? "-"}
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <p className="text-slate-400">Rata-rata waktu</p>
            <p className="text-2xl font-black mt-2">
              {formatMs(summary.avg_answer_ms ?? null)}
            </p>
          </div>
        </section>

        {quizEnded ? (
          <section className="rounded-3xl bg-slate-900 p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-3xl font-black">Podium Final</h2>

                <p className="text-slate-300 mt-2">
                  Ranking final setelah admin menyelesaikan kuis.
                </p>
              </div>

              {podiumReady && (
                <button
                  onClick={startPodiumAnimation}
                  className="rounded-2xl bg-purple-600 px-5 py-3 font-bold hover:bg-purple-700"
                >
                  Putar Ulang Podium
                </button>
              )}
            </div>

            {podiumReady ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {podiumRanks.map((item) => (
                  <div
                    key={item.participant_rank}
                    className="rounded-2xl bg-slate-950 p-5 text-center border border-slate-800"
                  >
                    <div className="text-4xl mb-3">
                      {item.participant_rank === 1
                        ? "🥇"
                        : item.participant_rank === 2
                        ? "🥈"
                        : item.participant_rank === 3
                        ? "🥉"
                        : "🏅"}
                    </div>

                    <p className="text-slate-400">
                      Juara {item.participant_rank}
                    </p>

                    <p className="text-xl font-black mt-2">
                      {item.display_name}
                    </p>

                    <p className="text-purple-200 font-bold mt-2">
                      {item.score} poin
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-950 p-5 text-slate-300">
                Podium belum tersedia. Tunggu beberapa detik atau muat ulang
                halaman.
              </div>
            )}
          </section>
        ) : (
          <section className="rounded-3xl bg-slate-900 p-6 mb-8">
            <h2 className="text-3xl font-black mb-3">
              Podium Belum Tersedia
            </h2>

            <p className="text-slate-300">
              Podium akan muncul setelah admin menekan tombol Selesaikan.
            </p>
          </section>
        )}

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="rounded-3xl bg-slate-900 p-6 text-center">
            <p className="text-slate-400">Benar</p>
            <p className="text-3xl font-black mt-2">{stats.correct}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-center">
            <p className="text-slate-400">Salah</p>
            <p className="text-3xl font-black mt-2">{stats.wrong}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-center">
            <p className="text-slate-400">Tidak dijawab</p>
            <p className="text-3xl font-black mt-2">{stats.unanswered}</p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6 text-center">
            <p className="text-slate-400">Total soal</p>
            <p className="text-3xl font-black mt-2">{stats.total}</p>
          </div>
        </section>

        <section id="review" className="rounded-3xl bg-slate-900 p-6 mb-8">
          <h2 className="text-3xl font-black mb-6">Review Jawaban</h2>

          {!quizEnded && (
            <div className="rounded-2xl bg-slate-950 p-5 text-slate-300">
              Review jawaban dan kunci benar baru dibuka setelah admin
              menyelesaikan kuis.
            </div>
          )}

          {quizEnded && reviewRows.length === 0 && (
            <div className="rounded-2xl bg-slate-950 p-5 text-slate-300">
              Belum ada detail jawaban untuk ditampilkan.
            </div>
          )}

          {quizEnded && reviewRows.length > 0 && (
            <div className="space-y-4">
              {reviewRows.map((row) => (
                <article
                  key={`${row.question_order}-${row.question_text}`}
                  className="rounded-2xl bg-slate-950 p-5"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                    <h3 className="text-xl font-black">
                      {row.question_order}. {row.question_text}
                    </h3>

                    <span
                      className={[
                        "rounded-full px-4 py-2 text-sm font-bold",
                        row.is_correct === true
                          ? "bg-green-500/10 text-green-300"
                          : row.is_correct === false
                          ? "bg-red-500/10 text-red-300"
                          : "bg-slate-800 text-slate-300",
                      ].join(" ")}
                    >
                      {row.is_correct === true
                        ? "Benar"
                        : row.is_correct === false
                        ? "Salah"
                        : "Tidak dijawab"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 mb-1">Jawaban kamu</p>
                      <p className="font-bold">
                        {row.selected_option_text ?? "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 mb-1">Jawaban benar</p>
                      <p className="font-bold">
                        {row.correct_option_text ?? "-"}
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 mb-1">Waktu / poin</p>
                      <p className="font-bold">
                        {formatMs(row.answer_ms)} · {row.points_awarded ?? 0}{" "}
                        poin
                      </p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <div className="text-center">
          <Link
            to="/thanks"
            className="inline-flex rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
          >
            Keluar dari Permainan
          </Link>
        </div>
      </section>
    </main>
  );
}