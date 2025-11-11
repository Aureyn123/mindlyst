import { FormEvent, useState, useEffect } from "react";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { parseCookies, getSession, readUsers } from "@/lib/auth";
import { initTheme } from "@/lib/theme";
import type { Habit, HabitStatus } from "@/lib/habits";

// Fonction helper côté client pour obtenir la date du jour
function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

type HabitsPageProps = {
  user: { id: string; email: string };
  habits: Habit[];
  today: string;
  weeklyStats: {
    totalHabits: number;
    averageSuccessRate: number;
    habitsStats: Array<{ habitId: string; habitName: string; successRate: number }>;
  };
};

function FormattedDate({ timestamp }: { timestamp: number }) {
  const [formatted, setFormatted] = useState<string>("");

  useEffect(() => {
    setFormatted(
      new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp))
    );
  }, [timestamp]);

  return <span>{formatted}</span>;
}

export default function HabitsPage({
  user,
  habits: initialHabits,
  today: initialToday,
  weeklyStats: initialWeeklyStats,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [habits, setHabits] = useState<Habit[]>(initialHabits);
  const [today, setToday] = useState(initialToday);
  const [weeklyStats, setWeeklyStats] = useState(initialWeeklyStats);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editColor, setEditColor] = useState("blue");
  const [showWeeklyStats, setShowWeeklyStats] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [sharingHabitId, setSharingHabitId] = useState<string | null>(null);
  const [shareUsername, setShareUsername] = useState("");
  const [sharePermission, setSharePermission] = useState<"read" | "write">("read");
  const [contacts, setContacts] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharedHabits, setSharedHabits] = useState<Habit[]>([]);

  useEffect(() => {
    initTheme();
    loadContacts();
    loadSharedHabits();
    // Vérifier si on est un nouveau jour
    const currentToday = getTodayDateString();
    if (currentToday !== today) {
      loadHabits();
    }
  }, []);

  async function loadContacts() {
    try {
      const response = await fetch("/api/contacts");
      if (response.ok) {
        const data = (await response.json()) as { contacts: Array<{ contactUserId: string; contactUsername: string; contactEmail: string }> };
        setContacts(data.contacts.map(c => ({ id: c.contactUserId, username: c.contactUsername, email: c.contactEmail })));
      }
    } catch (err) {
      console.error("Erreur lors du chargement des contacts:", err);
    }
  }

  async function loadSharedHabits() {
    try {
      const response = await fetch("/api/shares?shareType=habit");
      if (response.ok) {
        const data = (await response.json()) as { shares: Array<{ habitId: string }> };
        const habitIds = data.shares.map(s => (s as any).habitId).filter(Boolean);
        if (habitIds.length > 0) {
          const habitsResponse = await fetch("/api/habits");
          if (habitsResponse.ok) {
            const habitsData = (await habitsResponse.json()) as { habits: Habit[] };
            setSharedHabits(habitsData.habits.filter(h => habitIds.includes(h.id)));
          }
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des habitudes partagées:", err);
    }
  }

  async function handleSearchUsers() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const response = await fetch(`/api/contacts?search=${encodeURIComponent(searchQuery.trim())}`);
      if (response.ok) {
        const data = (await response.json()) as { users: Array<{ id: string; username: string; email: string }> };
        const contactUserIds = new Set(contacts.map((c) => c.id));
        setSearchResults(data.users.filter((u) => !contactUserIds.has(u.id) && u.id !== user.id));
      }
    } catch (err) {
      console.error("Erreur lors de la recherche:", err);
    }
  }

  async function handleShareHabit(habitId: string) {
    if (!shareUsername.trim()) {
      setError("Veuillez entrer un pseudo");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitId, sharedWithUsername: shareUsername.replace("@", ""), permission: sharePermission }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors du partage");
      }
      setShareUsername("");
      setSharingHabitId(null);
      setSearchQuery("");
      setSearchResults([]);
      alert("✅ Habitude partagée avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du partage");
    } finally {
      setLoading(false);
    }
  }

  async function loadHabits() {
    try {
      const response = await fetch("/api/habits");
      if (response.ok) {
        const data = (await response.json()) as {
          habits: Habit[];
          today: string;
          weeklyStats: typeof weeklyStats;
        };
        setHabits(data.habits);
        setToday(data.today);
        setWeeklyStats(data.weeklyStats);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des habitudes:", err);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Veuillez saisir un nom.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          color: color,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de la création");
      }
      const data = (await response.json()) as { habit: Habit; weeklyStats: typeof weeklyStats };
      setHabits((prev) => [...prev, data.habit]);
      setWeeklyStats(data.weeklyStats);
      setName("");
      setDescription("");
      setColor("blue");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleStatus(habitId: string, currentStatus: HabitStatus) {
    try {
      let newStatus: HabitStatus;
      if (currentStatus === "pending") {
        newStatus = "completed";
      } else if (currentStatus === "completed") {
        newStatus = "pending";
      } else {
        newStatus = "pending";
      }

      const response = await fetch(`/api/habits/${habitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, date: today }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }
      const data = (await response.json()) as { habit: Habit; weeklyStats: typeof weeklyStats };
      setHabits((prev) => prev.map((h) => (h.id === habitId ? data.habit : h)));
      setWeeklyStats(data.weeklyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  }

  async function handleSkip(habitId: string) {
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "skipped", date: today }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }
      const data = (await response.json()) as { habit: Habit; weeklyStats: typeof weeklyStats };
      setHabits((prev) => prev.map((h) => (h.id === habitId ? data.habit : h)));
      setWeeklyStats(data.weeklyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  }

  async function handleDelete(habitId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette habitude ?")) {
      return;
    }
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }
      const data = (await response.json()) as { weeklyStats: typeof weeklyStats };
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setWeeklyStats(data.weeklyStats);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }

  function startEdit(habit: Habit) {
    setEditingHabitId(habit.id);
    setEditName(habit.name);
    setEditDescription(habit.description || "");
    setEditColor(habit.color || "blue");
  }

  function cancelEdit() {
    setEditingHabitId(null);
    setEditName("");
    setEditDescription("");
    setEditColor("blue");
  }

  async function handleUpdate(habitId: string) {
    if (!editName.trim()) {
      setError("Veuillez saisir un nom.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || undefined,
          color: editColor,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de la modification");
      }
      const payload = (await response.json()) as { habit: Habit };
      setHabits((prev) => prev.map((h) => (h.id === habitId ? payload.habit : h)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setLoading(false);
    }
  }

  const colorOptions = [
    { value: "blue", label: "Bleu", class: "bg-blue-500" },
    { value: "green", label: "Vert", class: "bg-green-500" },
    { value: "purple", label: "Violet", class: "bg-purple-500" },
    { value: "pink", label: "Rose", class: "bg-pink-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "red", label: "Rouge", class: "bg-red-500" },
  ];

  const getColorClass = (colorValue: string) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500 border-blue-500",
      green: "bg-green-500 border-green-500",
      purple: "bg-purple-500 border-purple-500",
      pink: "bg-pink-500 border-pink-500",
      orange: "bg-orange-500 border-orange-500",
      red: "bg-red-500 border-red-500",
    };
    return colorMap[colorValue] || colorMap.blue;
  };

  return (
    <>
      <Head>
        <title>Habitudes quotidiennes · MindLyst</title>
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
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Habitudes quotidiennes</h1>
              <p className="text-slate-600 dark:text-slate-400">Suis tes habitudes et consulte tes statistiques</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowWeeklyStats(!showWeeklyStats)}
                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {showWeeklyStats ? "Masquer" : "Afficher"} les stats
              </button>
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
            </div>
          </header>

          {/* Statistiques hebdomadaires */}
          {showWeeklyStats && (
            <section className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">📊 Statistiques de la semaine</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Taux de réussite moyen</div>
                  <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                    {weeklyStats.averageSuccessRate}%
                  </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                  <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">Nombre d'habitudes</div>
                  <div className="text-3xl font-bold text-slate-900 dark:text-white">{weeklyStats.totalHabits}</div>
                </div>
              </div>
              {weeklyStats.habitsStats.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                    Détail par habitude :
                  </h3>
                  {weeklyStats.habitsStats.map((stat) => (
                    <div
                      key={stat.habitId}
                      className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-900 dark:text-white">{stat.habitName}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                stat.successRate >= 80
                                  ? "bg-green-500"
                                  : stat.successRate >= 50
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                              } transition-all`}
                              style={{ width: `${stat.successRate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 w-12 text-right">
                            {stat.successRate}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Bouton pour masquer/afficher le formulaire */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm font-medium"
            >
              {showCreateForm ? "▼" : "▶"} {showCreateForm ? "Masquer" : "Afficher"} le formulaire
            </button>
          </div>

          {/* Formulaire de création */}
          {showCreateForm && (
            <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm p-6 space-y-5">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Nouvelle habitude</h2>
              <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label htmlFor="habit-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Nom de l'habitude
                </label>
                <input
                  id="habit-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  placeholder="Ex: Méditation, Sport, Lecture..."
                />
              </div>
              <div>
                <label
                  htmlFor="habit-description"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Description (optionnel)
                </label>
                <textarea
                  id="habit-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  placeholder="Description de l'habitude..."
                />
              </div>
              <div>
                <label htmlFor="habit-color" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Couleur
                </label>
                <div className="flex gap-2">
                  {colorOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setColor(option.value)}
                      className={`w-10 h-10 rounded-full ${option.class} ${
                        color === option.value ? "ring-2 ring-slate-900 dark:ring-slate-400 ring-offset-2" : ""
                      } transition`}
                      title={option.label}
                    />
                  ))}
                </div>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600 text-white font-semibold rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Création…" : "Créer l'habitude"}
              </button>
            </form>
          </section>
          )}

          {/* Liste des habitudes */}
          <section className="space-y-4">
            {habits.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Aucune habitude pour le moment. Crée ta première habitude !</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {habits.map((habit) => {
                  const todayRecord = habit.dailyRecords.find((r) => r.date === today);
                  const currentStatus = todayRecord?.status || "pending";
                  const isEditing = editingHabitId === habit.id;
                  const colorClass = getColorClass(habit.color || "blue");

                  return (
                    <article
                      key={habit.id}
                      className={`bg-white dark:bg-slate-800 border-2 rounded-xl shadow-sm p-5 ${
                        currentStatus === "completed"
                          ? `${colorClass} border-opacity-50`
                          : currentStatus === "skipped"
                          ? "border-red-300 dark:border-red-800"
                          : "border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      {!isEditing ? (
                        <div className="flex items-start gap-4">
                          <button
                            onClick={() => handleToggleStatus(habit.id, currentStatus)}
                            className={`flex-shrink-0 w-7 h-7 rounded border-2 transition ${
                              currentStatus === "completed"
                                ? `${colorClass} border-opacity-100 flex items-center justify-center text-white`
                                : "border-slate-300 dark:border-slate-600 hover:border-purple-500 dark:hover:border-purple-400"
                            }`}
                            title={
                              currentStatus === "completed"
                                ? "Marquer comme non complétée"
                                : "Marquer comme complétée"
                            }
                          >
                            {currentStatus === "completed" && "✓"}
                          </button>
                          <div className="flex-1 min-w-0">
                            <h3
                              className={`text-lg font-semibold ${
                                currentStatus === "completed"
                                  ? "text-white line-through"
                                  : "text-slate-900 dark:text-white"
                              }`}
                            >
                              {habit.name}
                            </h3>
                            {habit.description && (
                              <p
                                className={`text-sm mt-1 ${
                                  currentStatus === "completed"
                                    ? "text-white/90 line-through"
                                    : "text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {habit.description}
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3">
                              <span
                                className={`text-xs ${
                                  currentStatus === "completed"
                                    ? "text-white/80"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                              >
                                Aujourd'hui
                              </span>
                              {currentStatus !== "skipped" && (
                                <button
                                  onClick={() => handleSkip(habit.id)}
                                  className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                                  title="Marquer comme non faite"
                                >
                                  ✕ Passer
                                </button>
                              )}
                              <button
                                onClick={() => startEdit(habit)}
                                className={`text-xs hover:underline ${
                                  currentStatus === "completed"
                                    ? "text-white/80 hover:text-white"
                                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                                }`}
                              >
                                Modifier
                              </button>
                              <button
                                onClick={() => {
                                  setSharingHabitId(habit.id);
                                  setShareUsername("");
                                  setSearchQuery("");
                                  setSearchResults([]);
                                }}
                                className={`text-xs hover:underline ${
                                  currentStatus === "completed"
                                    ? "text-white/80 hover:text-white"
                                    : "text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                                }`}
                                title="Partager cette habitude"
                              >
                                🔗 Partager
                              </button>
                              <button
                                onClick={() => handleDelete(habit.id)}
                                className={`text-xs hover:underline ${
                                  currentStatus === "completed"
                                    ? "text-white/80 hover:text-white"
                                    : "text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                }`}
                              >
                                Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2"
                            placeholder="Nom..."
                          />
                          <textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            rows={2}
                            className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2"
                            placeholder="Description..."
                          />
                          <div>
                            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Couleur</label>
                            <div className="flex gap-2">
                              {colorOptions.map((option) => (
                                <button
                                  key={option.value}
                                  type="button"
                                  onClick={() => setEditColor(option.value)}
                                  className={`w-8 h-8 rounded-full ${option.class} ${
                                    editColor === option.value ? "ring-2 ring-slate-900 dark:ring-slate-400" : ""
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(habit.id)}
                              disabled={loading}
                              className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-60"
                            >
                              {loading ? "Sauvegarde..." : "Sauvegarder"}
                            </button>
                            <button
                              onClick={cancelEdit}
                              disabled={loading}
                              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-60"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Habitudes partagées avec moi */}
          {sharedHabits.length > 0 && (
            <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200">📥 Habitudes partagées avec moi</h2>
              <div className="grid gap-3">
                {sharedHabits.map((habit) => {
                  const todayRecord = habit.dailyRecords.find((r) => r.date === today);
                  const status = todayRecord?.status || "pending";
                  return (
                    <article
                      key={habit.id}
                      className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-4 h-4 rounded-full ${getColorClass(habit.color || "blue").split(" ")[0]}`} />
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{habit.name}</h3>
                          </div>
                          {habit.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{habit.description}</p>
                          )}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">Aujourd'hui :</span>
                            {status === "completed" && <span className="text-xs text-green-600 dark:text-green-400">✅ Complétée</span>}
                            {status === "skipped" && <span className="text-xs text-yellow-600 dark:text-yellow-400">⏭️ Passée</span>}
                            {status === "pending" && <span className="text-xs text-slate-500 dark:text-slate-400">⏳ En attente</span>}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        {/* Modal pour partager une habitude */}
        {sharingHabitId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSharingHabitId(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Partager l'habitude</h3>
                <button
                  onClick={() => setSharingHabitId(null)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                {/* Recherche d'utilisateurs */}
                <div>
                  <label htmlFor="search-share-habit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rechercher un utilisateur
                  </label>
                  <input
                    id="search-share-habit"
                    type="text"
                    value={searchQuery}
                    onChange={e => {
                      setSearchQuery(e.target.value);
                      if (e.target.value.trim()) {
                        handleSearchUsers();
                      } else {
                        setSearchResults([]);
                      }
                    }}
                    placeholder="Rechercher par pseudo..."
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
                        >
                          <div>
                            <div className="font-medium text-slate-900 dark:text-white text-sm">@{user.username}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                          </div>
                          <button
                            onClick={() => {
                              setShareUsername(user.username);
                              setSearchQuery("");
                              setSearchResults([]);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                          >
                            Sélectionner
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Partager avec un utilisateur */}
                <div>
                  <label htmlFor="share-username-habit" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Partager avec (pseudo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="share-username-habit"
                      type="text"
                      value={shareUsername}
                      onChange={e => setShareUsername(e.target.value)}
                      placeholder="@pseudo"
                      className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                      onKeyPress={e => e.key === "Enter" && handleShareHabit(sharingHabitId)}
                    />
                    <select
                      value={sharePermission}
                      onChange={e => setSharePermission(e.target.value as "read" | "write")}
                      className="rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                    >
                      <option value="read">Lecture seule</option>
                      <option value="write">Modification</option>
                    </select>
                    <button
                      onClick={() => handleShareHabit(sharingHabitId)}
                      className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition"
                    >
                      Partager
                    </button>
                  </div>
                </div>

                {/* Liste des contacts */}
                {contacts.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 font-medium">Mes contacts :</p>
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                      {contacts.map((contact) => (
                        <button
                          key={contact.id}
                          onClick={() => {
                            setShareUsername(contact.username);
                          }}
                          className="px-3 py-1 text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition"
                        >
                          @{contact.username}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<HabitsPageProps> = async (context) => {
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

  // Charger les habitudes
  const { getUserHabits, getWeeklyStats, getTodayDateString } = await import("@/lib/habits");
  const habits = await getUserHabits(session.userId);
  const today = getTodayDateString();
  const weeklyStats = getWeeklyStats(habits);

  return {
    props: {
      user: { id: user.id, email: user.email },
      habits,
      today,
      weeklyStats,
    },
  };
};

