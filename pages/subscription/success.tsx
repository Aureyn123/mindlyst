import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const { session_id } = router.query;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Rediriger vers le dashboard après 3 secondes
    const timer = setTimeout(() => {
      router.push("/dashboard");
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <>
      <Head>
        <title>Abonnement activé · MindLyst</title>
      </Head>
      <main className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-white rounded-lg border border-slate-200 shadow-sm p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Abonnement activé !</h1>
            <p className="text-slate-600">
              Votre abonnement Pro a été activé avec succès. Vous pouvez maintenant créer jusqu'à 10 notes par jour.
            </p>
          </div>
          <div className="space-y-3">
            <Link
              href="/dashboard"
              className="block w-full rounded-md bg-blue-600 text-white px-6 py-3 font-medium hover:bg-blue-700 transition"
            >
              Aller au dashboard
            </Link>
            <p className="text-sm text-slate-500">Redirection automatique dans 3 secondes...</p>
          </div>
        </div>
      </main>
    </>
  );
}

