import { Link } from "react-router-dom";

export function ThanksPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="max-w-xl text-center rounded-3xl bg-slate-900 p-8 shadow-xl">
        <div className="text-6xl mb-5">🏁</div>

        <h1 className="text-4xl font-black mb-4">
          Terima kasih sudah bermain
        </h1>

        <p className="text-slate-300 mb-8">
          Demo kuis selesai. Pada versi final, halaman ini akan muncul setelah
          peserta melihat skor, ranking, dan review jawaban.
        </p>

        <Link
          to="/"
          className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
        >
          Kembali ke Home
        </Link>
      </section>
    </main>
  );
}