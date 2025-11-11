import { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";
import { useState, useEffect } from "react";
import { getPublicShareByToken } from "@/lib/shares";
import { readJson } from "@/lib/db";

type Note = {
  id: string;
  userId: string;
  title: string;
  text: string;
  category: string;
  createdAt: number;
};

type SharedPageProps = {
  note: Note | null;
  error?: string;
};

function FormattedDate({ timestamp }: { timestamp: number }) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    setFormatted(
      new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date(timestamp))
    );
  }, [timestamp]);

  return <span>{formatted}</span>;
}

export default function SharedNotePage({ note, error }: SharedPageProps) {
  if (error || !note) {
    return (
      <>
        <Head>
          <title>Note partagée · MindLyst</title>
        </Head>
        <main className="min-h-screen flex items-center justify-center px-6 bg-slate-50 dark:bg-slate-900">
          <div className="max-w-md w-full text-center space-y-4">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Lien invalide</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {error || "Cette note partagée n'existe plus ou a expiré."}
            </p>
            <Link
              href="/"
              className="inline-block rounded-md bg-slate-900 dark:bg-slate-700 text-white px-5 py-2.5 font-medium hover:bg-slate-700 dark:hover:bg-slate-600 transition"
            >
              Retour à l'accueil
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{note.title} · Note partagée · MindLyst</title>
      </Head>
      <main className="min-h-screen px-6 py-10 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              ← Retour à l'accueil
            </Link>
          </div>
          <article className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-8">
            <div className="mb-4">
              <span className="inline-block capitalize bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full text-sm font-medium">
                {note.category}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">{note.title}</h1>
            <div className="mb-6">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                <FormattedDate timestamp={note.createdAt} />
              </span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                {note.text}
              </p>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
              <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                Note partagée via MindLyst
              </p>
            </div>
          </article>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SharedPageProps> = async (context) => {
  const { token } = context.params as { token: string };
  
  try {
    const publicShare = await getPublicShareByToken(token);
    
    if (!publicShare) {
      return {
        props: {
          note: null,
          error: "Lien de partage invalide ou expiré",
        },
      };
    }

    // Récupérer la note
    const notes = await readJson<any[]>("notes.json", []);
    const note = notes.find((n) => n.id === publicShare.noteId);
    
    if (!note) {
      return {
        props: {
          note: null,
          error: "Note non trouvée",
        },
      };
    }

    return {
      props: {
        note: note as Note,
      },
    };
  } catch (error) {
    return {
      props: {
        note: null,
        error: "Erreur lors du chargement de la note",
      },
    };
  }
};

