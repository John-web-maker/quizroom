import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <section className="w-full max-w-4xl text-center">
        <p className="inline-flex rounded-full bg-purple-500/20 px-5 py-2 text-purple-200 font-bold mb-6">
          Platform kuis interaktif untuk kelas dan presentasi
        </p>

        <h1 className="text-6xl md:text-8xl font-black mb-6">
          QuizRoom
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-slate-300 mb-10">
          Buat kuis sebagai admin, bagikan kode room ke peserta, pantau live
          score, dan aktifkan pencatatan indikasi anti-cheating.
        </p>

        <div className="flex flex-col md:flex-row gap-4 justify-center">
          <Link
            to="/join"
            className="rounded-2xl bg-purple-600 px-8 py-4 font-bold hover:bg-purple-700"
          >
            Masuk sebagai Peserta
          </Link>

          <Link
            to="/admin/login"
            className="rounded-2xl bg-slate-800 px-8 py-4 font-bold hover:bg-slate-700"
          >
            Login Admin
          </Link>

          <Link
            to="/admin/signup"
            className="rounded-2xl bg-slate-700 px-8 py-4 font-bold hover:bg-slate-600"
          >
            Daftar Admin
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          <div className="rounded-3xl bg-slate-900 p-6">
            <h2 className="text-xl font-black mb-2">Untuk Peserta</h2>
            <p className="text-slate-300">
              Peserta cukup memasukkan kode kuis dan nama. Tidak perlu membuat
              akun.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <h2 className="text-xl font-black mb-2">Untuk Admin</h2>
            <p className="text-slate-300">
              Admin bisa membuat kuis, menambah soal, memantau peserta, dan
              melihat hasil.
            </p>
          </div>

          <div className="rounded-3xl bg-slate-900 p-6">
            <h2 className="text-xl font-black mb-2">Mode Aman</h2>
            <p className="text-slate-300">
              Sistem mencatat indikasi pindah tab, keluar fullscreen, dan
              aktivitas mencurigakan lain.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}