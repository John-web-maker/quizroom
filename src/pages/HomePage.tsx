import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="max-w-3xl text-center">
        <div className="mb-6 inline-flex rounded-full bg-purple-500/20 px-4 py-2 text-sm text-purple-200">
          Quiz platform untuk kelas dan presentasi
        </div>

        <h1 className="text-5xl md:text-7xl font-black mb-6">
          QuizRoom
        </h1>

        <p className="text-lg text-slate-300 mb-8">
          Platform kuis sederhana dengan lobby peserta, halaman admin, live quiz,
          skor, dan Mode Aman untuk mencatat indikasi cheating.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/admin/login"
            className="rounded-2xl bg-purple-600 px-7 py-4 font-bold hover:bg-purple-700"
          >
            Masuk Admin
          </Link>

          <Link
            to="/join/DEMO"
            className="rounded-2xl bg-slate-800 px-7 py-4 font-bold hover:bg-slate-700"
          >
            Coba Halaman Peserta
          </Link>
        </div>
      </section>
    </main>
  );
}