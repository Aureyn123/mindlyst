import Link from "next/link";
import { GetServerSideProps } from "next";
import { parseCookies, getSession } from "@/lib/auth";

type HomePageProps = {
  isAuthenticated: boolean;
};

export default function HomePage({ isAuthenticated }: HomePageProps) {
  if (isAuthenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="inline-block p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
              <span className="text-6xl">📝</span>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
              MindLyst
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              Choisis ce que tu veux gérer aujourd'hui
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12">
            <Link
              href="/dashboard"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400"
            >
              <div className="text-5xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gestionnaire de notes</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Crée, organise et partage tes notes. Synchronise avec ton calendrier.
              </p>
              <div className="mt-4 text-blue-600 dark:text-blue-400 font-medium group-hover:underline">
                Accéder →
              </div>
            </Link>
            <Link
              href="/tasks"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-green-500 dark:hover:border-green-400"
            >
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gestionnaire de tâches</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Crée tes tâches, coche-les une fois terminées et suive ton progrès.
              </p>
              <div className="mt-4 text-green-600 dark:text-green-400 font-medium group-hover:underline">
                Accéder →
              </div>
            </Link>
            <Link
              href="/habits"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400"
            >
              <div className="text-5xl mb-4">🔄</div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Habitudes quotidiennes</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Suis tes habitudes quotidiennes. Réinitialisation automatique chaque jour.
              </p>
              <div className="mt-4 text-purple-600 dark:text-purple-400 font-medium group-hover:underline">
                Accéder →
              </div>
            </Link>
            <Link
              href="/contacts"
              className="group relative bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2 border-2 border-transparent hover:border-orange-500 dark:hover:border-orange-400"
            >
              <div className="text-5xl mb-4">👥</div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Gestionnaire de contacts</h2>
              <p className="text-slate-600 dark:text-slate-400">
                Gère tes contacts et partage facilement avec tes amis.
              </p>
              <div className="mt-4 text-orange-600 dark:text-orange-400 font-medium group-hover:underline">
                Accéder →
              </div>
            </Link>
          </div>
          <div className="pt-6">
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                } catch (err) {
                  console.error("Erreur lors de la déconnexion:", err);
                }
              }}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <div className="inline-block p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
            <span className="text-6xl">📝</span>
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
            MindLyst
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            Capture tes idées, organise tes notes et synchronise-les avec ton calendrier. Simple et rapide.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 font-semibold text-lg transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            <span>✨</span>
            Commencer gratuitement
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-8 py-4 font-semibold text-lg hover:bg-white dark:hover:bg-slate-800 transition"
          >
            Se connecter
          </Link>
        </div>
        <div className="pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">🎤</div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Dictée vocale</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Parle, on écrit pour toi</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">📅</div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Calendrier</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Ajout automatique des dates</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
            <div className="text-3xl mb-3">🔗</div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Partage</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Partage tes notes facilement</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async (context) => {
  const cookies = parseCookies(context.req);
  const token = cookies["mindlyst_session"];
  let isAuthenticated = false;

  if (token) {
    const session = await getSession(token);
    isAuthenticated = !!session;
  }

  return {
    props: {
      isAuthenticated,
    },
  };
};


