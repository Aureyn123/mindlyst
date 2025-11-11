import { useState, useEffect } from "react";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { parseCookies, getSession, readUsers } from "@/lib/auth";
import { initTheme } from "@/lib/theme";
import { getUserContacts } from "@/lib/contacts";

type Contact = {
  id: string;
  userId: string;
  contactUserId: string;
  contactUsername: string;
  contactEmail: string;
  createdAt: number;
};

type ContactRequest = {
  id: string;
  requesterId: string;
  requesterUsername: string;
  requesterEmail: string;
  recipientId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
};

type ContactsPageProps = {
  user: { id: string; email: string; username: string };
  contacts: Contact[];
};

export default function ContactsPage({
  user,
  contacts: initialContacts,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; email: string; username: string }>>([]);
  const [pendingRequests, setPendingRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initTheme();
    loadPendingRequests();
  }, []);

  async function loadContacts() {
    try {
      const response = await fetch("/api/contacts");
      if (response.ok) {
        const data = (await response.json()) as { contacts: Contact[] };
        setContacts(data.contacts);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des contacts:", err);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/contacts?search=${encodeURIComponent(searchQuery.trim())}`);
      if (!response.ok) {
        throw new Error("Erreur lors de la recherche");
      }
      const data = (await response.json()) as { users: Array<{ id: string; email: string; username: string }> };
      // Filtrer les utilisateurs déjà dans les contacts
      const contactUserIds = new Set(contacts.map((c) => c.contactUserId));
      setSearchResults(data.users.filter((u) => !contactUserIds.has(u.id) && u.id !== user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la recherche");
    } finally {
      setLoading(false);
    }
  }

  async function loadPendingRequests() {
    try {
      const response = await fetch("/api/contacts/requests");
      if (response.ok) {
        const data = (await response.json()) as { requests: ContactRequest[] };
        setPendingRequests(data.requests);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des demandes:", err);
    }
  }

  async function handleAddContact(contactUserId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactUserId, action: "request" }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de l'envoi de la demande");
      }
      setSearchQuery("");
      setSearchResults([]);
      alert("✅ Demande de contact envoyée !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi de la demande");
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptRequest(requestId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "accept" }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de l'acceptation");
      }
      await loadContacts();
      await loadPendingRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'acceptation");
    } finally {
      setLoading(false);
    }
  }

  async function handleRejectRequest(requestId: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action: "reject" }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors du refus");
      }
      await loadPendingRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du refus");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveContact(contactId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }
      const data = (await response.json()) as { contacts: Contact[] };
      setContacts(data.contacts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Head>
        <title>Gestionnaire de contacts · MindLyst</title>
      </Head>
      <main className="min-h-screen px-6 py-10 bg-slate-50 dark:bg-slate-900">
        <div className="max-w-4xl mx-auto space-y-8">
          <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/"
                  className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                  title="Retour au menu"
                >
                  ← Retour
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestionnaire de contacts</h1>
              <p className="text-slate-600 dark:text-slate-400">Gère tes contacts et partage facilement</p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-1">Ton pseudo : <strong>@{user.username}</strong></p>
            </div>
            <button
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.href = "/";
                } catch (err) {
                  console.error("Erreur lors de la déconnexion:", err);
                }
              }}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Se déconnecter
            </button>
          </header>

          {/* Demandes en attente */}
          {pendingRequests.length > 0 && (
            <section className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl shadow-sm p-6 space-y-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                📬 Demandes de contact ({pendingRequests.length})
              </h2>
              <div className="space-y-2">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-yellow-200 dark:border-yellow-700"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">@{request.requesterUsername}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{request.requesterEmail}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(request.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60"
                      >
                        Accepter
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        Refuser
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Recherche d'utilisateurs */}
          <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Rechercher un utilisateur</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Rechercher par pseudo..."
                className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
              />
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="px-6 py-2 bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-white font-semibold rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Recherche..." : "Rechercher"}
              </button>
            </div>

            {/* Résultats de recherche */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Résultats :</h3>
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                  >
                    <div>
                      <div className="font-medium text-slate-900 dark:text-white">@{result.username}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{result.email}</div>
                    </div>
                    <button
                      onClick={() => handleAddContact(result.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 disabled:opacity-60"
                    >
                      Ajouter
                    </button>
                  </div>
                ))}
              </div>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
          </section>

          {/* Liste des contacts */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Mes contacts ({contacts.length})</h2>
            {contacts.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Aucun contact pour le moment. Recherche des utilisateurs pour en ajouter !</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {contacts.map((contact) => (
                  <article
                    key={contact.id}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-white">@{contact.contactUsername}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{contact.contactEmail}</div>
                      </div>
                      <button
                        onClick={() => handleRemoveContact(contact.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<ContactsPageProps> = async (context) => {
  const cookies = parseCookies(context.req);
  const token = cookies["mindlyst_session"];
  if (!token) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
  const session = await getSession(token);
  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const users = await readUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  // Charger les contacts
  const contacts = await getUserContacts(session.userId);

  // Gérer les utilisateurs existants sans pseudo (migration)
  if (!user.username) {
    user.username = user.email.split("@")[0];
    const users = await readUsers();
    const userIndex = users.findIndex((u) => u.id === user.id);
    if (userIndex !== -1) {
      users[userIndex].username = user.username;
      const { writeUsers } = await import("@/lib/auth");
      await writeUsers(users);
    }
  }

  return {
    props: {
      user: { id: user.id, email: user.email, username: user.username },
      contacts,
    },
  };
};

