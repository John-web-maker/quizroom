import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";

type Quiz = {
  id: string;
  title: string;
  room_code: string | null;
};

type Question = {
  id: string;
  order_no: number;
  question_text: string;
  time_limit_seconds: number;
  base_points: number;
};

type Option = {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  order_no: number;
};

export function QuizEditorPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [options, setOptions] = useState<Option[]>([]);

  const [questionText, setQuestionText] = useState("");
  const [timeLimit, setTimeLimit] = useState(20);
  const [basePoints, setBasePoints] = useState(1000);
  const [optionTexts, setOptionTexts] = useState(["", "", "", ""]);
  const [correctIndex, setCorrectIndex] = useState(0);

  const [errorText, setErrorText] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadData() {
    if (!quizId) return;

    setLoading(true);
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
      .select("id, title, room_code")
      .eq("id", quizId)
      .single();

    if (quizError) {
      setErrorText(quizError.message);
      setLoading(false);
      return;
    }

    const { data: questionData, error: questionError } = await supabase
      .from("questions")
      .select("id, order_no, question_text, time_limit_seconds, base_points")
      .eq("quiz_id", quizId)
      .order("order_no", { ascending: true });

    if (questionError) {
      setErrorText(questionError.message);
      setLoading(false);
      return;
    }

    const questionIds = (questionData ?? []).map((q) => q.id);

    let optionData: Option[] = [];

    if (questionIds.length > 0) {
      const { data, error } = await supabase
        .from("options")
        .select("id, question_id, option_text, is_correct, order_no")
        .in("question_id", questionIds)
        .order("order_no", { ascending: true });

      if (error) {
        setErrorText(error.message);
        setLoading(false);
        return;
      }

      optionData = data ?? [];
    }

    setQuiz(quizData);
    setQuestions(questionData ?? []);
    setOptions(optionData);
    setLoading(false);
  }

  async function addQuestion(e: FormEvent) {
    e.preventDefault();

    if (!quizId) return;

    setErrorText("");

    const cleanOptions = optionTexts.map((text) => text.trim());

    if (cleanOptions.some((text) => text.length === 0)) {
      setErrorText("Semua opsi jawaban harus diisi.");
      return;
    }

    const nextOrder = questions.length + 1;

    const { data: insertedQuestion, error: questionError } = await supabase
      .from("questions")
      .insert({
        quiz_id: quizId,
        order_no: nextOrder,
        question_text: questionText,
        time_limit_seconds: timeLimit,
        base_points: basePoints,
      })
      .select("id")
      .single();

    if (questionError) {
      setErrorText(questionError.message);
      return;
    }

    const optionRows = cleanOptions.map((text, index) => ({
      question_id: insertedQuestion.id,
      option_text: text,
      is_correct: index === correctIndex,
      order_no: index + 1,
    }));

    const { error: optionsError } = await supabase
      .from("options")
      .insert(optionRows);

    if (optionsError) {
      setErrorText(optionsError.message);
      return;
    }

    setQuestionText("");
    setTimeLimit(20);
    setBasePoints(1000);
    setOptionTexts(["", "", "", ""]);
    setCorrectIndex(0);

    await loadData();
  }

  useEffect(() => {
    loadData();
  }, [quizId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Memuat editor soal...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <section className="mx-auto max-w-5xl">
        <Link to="/admin" className="text-purple-300 underline">
          ← Kembali ke Dashboard
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-4xl font-black">Edit Soal</h1>
          <p className="text-slate-300 mt-2">
            Quiz: <span className="font-bold text-white">{quiz?.title}</span>
          </p>
          <p className="text-slate-300">
            Room Code: <span className="font-bold text-white">{quiz?.room_code}</span>
          </p>
        </header>

        <form
          onSubmit={addQuestion}
          className="mb-8 rounded-3xl bg-slate-900 p-6 shadow-xl"
        >
          <h2 className="text-2xl font-black mb-5">Tambah Soal</h2>

          <label className="block mb-4">
            <span className="block mb-2 text-slate-300">Pertanyaan</span>
            <textarea
              className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
              rows={3}
              placeholder="Tulis pertanyaan di sini"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              required
            />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <label>
              <span className="block mb-2 text-slate-300">Durasi soal, detik</span>
              <input
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
                type="number"
                min={5}
                max={300}
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                required
              />
            </label>

            <label>
              <span className="block mb-2 text-slate-300">Poin dasar</span>
              <input
                className="w-full rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
                type="number"
                min={100}
                max={10000}
                value={basePoints}
                onChange={(e) => setBasePoints(Number(e.target.value))}
                required
              />
            </label>
          </div>

          <div className="space-y-3 mb-5">
            {optionTexts.map((text, index) => (
              <div key={index} className="flex gap-3 items-center">
                <input
                  type="radio"
                  checked={correctIndex === index}
                  onChange={() => setCorrectIndex(index)}
                />

                <input
                  className="flex-1 rounded-2xl bg-slate-800 border border-slate-700 p-4 outline-none focus:border-purple-500"
                  placeholder={`Opsi ${index + 1}`}
                  value={text}
                  onChange={(e) => {
                    const next = [...optionTexts];
                    next[index] = e.target.value;
                    setOptionTexts(next);
                  }}
                  required
                />
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-400 mb-5">
            Pilih radio button untuk menentukan jawaban benar.
          </p>

          {errorText && (
            <div className="mb-5 rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-red-300">
              {errorText}
            </div>
          )}

          <button className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700">
            Simpan Soal
          </button>
        </form>

        <div className="space-y-4">
          <h2 className="text-2xl font-black">Daftar Soal</h2>

          {questions.length === 0 && (
            <div className="rounded-3xl bg-slate-900 p-8 text-center text-slate-300">
              Belum ada soal.
            </div>
          )}

          {questions.map((question) => {
            const opts = options.filter((option) => option.question_id === question.id);

            return (
              <article key={question.id} className="rounded-3xl bg-slate-900 p-6">
                <h3 className="text-xl font-black mb-2">
                  {question.order_no}. {question.question_text}
                </h3>

                <p className="text-slate-400 mb-4">
                  Durasi: {question.time_limit_seconds} detik · Poin: {question.base_points}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {opts.map((option) => (
                    <div
                      key={option.id}
                      className={[
                        "rounded-2xl p-4",
                        option.is_correct
                          ? "bg-green-500/20 border border-green-500/40"
                          : "bg-slate-800 border border-slate-700",
                      ].join(" ")}
                    >
                      {option.option_text}
                      {option.is_correct && (
                        <span className="ml-2 text-green-300 font-bold">
                          ✓ benar
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}