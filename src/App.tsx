import { Link, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { LobbyPage } from "./pages/LobbyPage";
import { PlayPage } from "./pages/PlayPage";
import { ResultPage } from "./pages/ResultPage";
import { ThanksPage } from "./pages/ThanksPage";
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { QuizEditorPage } from "./pages/admin/QuizEditorPage";
import { AdminLiveMonitorPage } from "./pages/admin/AdminLiveMonitorPage";
import { AdminCheatingPage } from "./pages/admin/AdminCheatingPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/join/:roomCode" element={<JoinPage />} />
      <Route path="/lobby/:roomCode" element={<LobbyPage />} />
      <Route path="/play/:roomCode" element={<PlayPage />} />
      <Route path="/result/:roomCode" element={<ResultPage />} />
      <Route path="/thanks" element={<ThanksPage />} />
      <Route path="/admin/cheating/:quizId" element={<AdminCheatingPage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboardPage />} />
      <Route path="/admin/quiz/:quizId/edit" element={<QuizEditorPage />} />
      <Route path="/admin/live/:quizId" element={<AdminLiveMonitorPage />} />

      <Route
        path="*"
        element={
          <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
            <section className="text-center">
              <h1 className="text-4xl font-black mb-4">
                Halaman tidak ditemukan
              </h1>
              <Link to="/" className="underline text-purple-300">
                Kembali ke halaman utama
              </Link>
            </section>
          </main>
        }
      />
    </Routes>
  );
}