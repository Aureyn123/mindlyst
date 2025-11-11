import { FormEvent, useState, useEffect } from "react";
import { GetServerSideProps, InferGetServerSidePropsType } from "next";
import Head from "next/head";
import Link from "next/link";
import { parseCookies, getSession, readUsers } from "@/lib/auth";
import { readJson } from "@/lib/db";
import { initTheme } from "@/lib/theme";

type TaskStatus = "pending" | "completed" | "cancelled";

type SubTask = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
};

type Task = {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  subTasks: SubTask[];
  createdAt: number;
  updatedAt: number;
};

type TasksPageProps = {
  user: { id: string; email: string };
  tasks: Task[];
  completionRate: number;
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

export default function TasksPage({
  user,
  tasks: initialTasks,
  completionRate: initialCompletionRate,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [completionRate, setCompletionRate] = useState(initialCompletionRate);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subTasksInput, setSubTasksInput] = useState(""); // Pour créer plusieurs sous-tâches (une par ligne)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [addingSubTaskTo, setAddingSubTaskTo] = useState<string | null>(null);
  const [newSubTaskText, setNewSubTaskText] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [sharingTaskId, setSharingTaskId] = useState<string | null>(null);
  const [shareUsername, setShareUsername] = useState("");
  const [sharePermission, setSharePermission] = useState<"read" | "write">("read");
  const [contacts, setContacts] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; email: string }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sharedTasks, setSharedTasks] = useState<Task[]>([]);

  // Calculer le pourcentage de complétion d'une tâche
  function calculateTaskCompletionRate(task: Task): number {
    if (task.subTasks.length === 0) {
      return task.status === "completed" ? 100 : 0;
    }
    const completed = task.subTasks.filter((st) => st.completed).length;
    return Math.round((completed / task.subTasks.length) * 100);
  }

  useEffect(() => {
    initTheme();
    loadContacts();
    loadSharedTasks();
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

  async function loadSharedTasks() {
    try {
      const response = await fetch("/api/shares?shareType=task");
      if (response.ok) {
        const data = (await response.json()) as { shares: Array<{ taskId: string }> };
        const taskIds = data.shares.map(s => (s as any).taskId).filter(Boolean);
        if (taskIds.length > 0) {
          const tasksResponse = await fetch("/api/tasks");
          if (tasksResponse.ok) {
            const tasksData = (await tasksResponse.json()) as { tasks: Task[] };
            setSharedTasks(tasksData.tasks.filter(t => taskIds.includes(t.id)));
          }
        }
      }
    } catch (err) {
      console.error("Erreur lors du chargement des tâches partagées:", err);
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

  async function handleShareTask(taskId: string) {
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
        body: JSON.stringify({ taskId, sharedWithUsername: shareUsername.replace("@", ""), permission: sharePermission }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors du partage");
      }
      setShareUsername("");
      setSharingTaskId(null);
      setSearchQuery("");
      setSearchResults([]);
      alert("✅ Tâche partagée avec succès !");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors du partage");
    } finally {
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const response = await fetch("/api/tasks");
      if (response.ok) {
        const data = (await response.json()) as { tasks: Task[]; completionRate: number };
        setTasks(data.tasks);
        setCompletionRate(data.completionRate);
      }
    } catch (err) {
      console.error("Erreur lors du chargement des tâches:", err);
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Veuillez saisir un titre.");
      return;
    }
    setLoading(true);
    try {
      // Parser les sous-tâches (une par ligne)
      const subTasks = subTasksInput
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          subTasks: subTasks.length > 0 ? subTasks : undefined,
        }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de la création");
      }
      const data = (await response.json()) as { task: Task; completionRate: number };
      setTasks((prev) => [...prev, data.task]);
      setCompletionRate(data.completionRate);
      setTitle("");
      setDescription("");
      setSubTasksInput("");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleSubTask(taskId: string, subTaskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggleSubTask", subTaskId }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }
      const data = (await response.json()) as { task: Task; completionRate: number };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setCompletionRate(data.completionRate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  }

  async function handleAddSubTask(taskId: string) {
    if (!newSubTaskText.trim()) {
      setError("Veuillez saisir une sous-tâche.");
      return;
    }
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addSubTask", subTaskText: newSubTaskText.trim() }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de l'ajout");
      }
      const data = (await response.json()) as { task: Task; completionRate: number };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setCompletionRate(data.completionRate);
      setNewSubTaskText("");
      setAddingSubTaskTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'ajout");
    }
  }

  async function handleDeleteSubTask(taskId: string, subTaskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteSubTask", subTaskId }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }
      const data = (await response.json()) as { task: Task; completionRate: number };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setCompletionRate(data.completionRate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }

  async function handleToggleStatus(taskId: string, currentStatus: TaskStatus) {
    try {
      let newStatus: TaskStatus;
      if (currentStatus === "pending") {
        newStatus = "completed";
      } else if (currentStatus === "completed") {
        newStatus = "pending";
      } else {
        newStatus = "pending";
      }

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }
      const data = (await response.json()) as { task: Task; completionRate: number };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setCompletionRate(data.completionRate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  }

  async function handleCancel(taskId: string) {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la mise à jour");
      }
      const data = (await response.json()) as { task: Task; completionRate: number };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? data.task : t)));
      setCompletionRate(data.completionRate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la mise à jour");
    }
  }

  async function handleDelete(taskId: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette tâche ?")) {
      return;
    }
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Erreur lors de la suppression");
      }
      const data = (await response.json()) as { completionRate: number };
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setCompletionRate(data.completionRate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la suppression");
    }
  }

  function startEdit(task: Task) {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || "");
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
  }

  async function handleUpdate(taskId: string) {
    if (!editTitle.trim()) {
      setError("Veuillez saisir un titre.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), description: editDescription.trim() || undefined }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Erreur lors de la modification");
      }
      const payload = (await response.json()) as { task: Task };
      setTasks((prev) => prev.map((t) => (t.id === taskId ? payload.task : t)));
      cancelEdit();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la modification");
    } finally {
      setLoading(false);
    }
  }

  const pendingTasks = tasks.filter((t) => t.status === "pending");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const cancelledTasks = tasks.filter((t) => t.status === "cancelled");

  return (
    <>
      <Head>
        <title>Gestionnaire de tâches · MindLyst</title>
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
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Gestionnaire de tâches</h1>
              <p className="text-slate-600 dark:text-slate-400">Organise tes tâches et suive ton progrès</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-lg px-6 py-3 border border-slate-200 dark:border-slate-700">
                <div className="text-sm text-slate-500 dark:text-slate-400">Progression</div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{completionRate}%</div>
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
            </div>
          </header>

          {/* Barre de progression */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {completedTasks.length} / {tasks.length} tâches complétées
              </span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{completionRate}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500 rounded-full"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>

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
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Nouvelle tâche</h2>
              <form className="space-y-4" onSubmit={handleCreate}>
              <div>
                <label htmlFor="task-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Titre
                </label>
                <input
                  id="task-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  placeholder="Titre de la tâche..."
                />
              </div>
              <div>
                <label
                  htmlFor="task-description"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Description (optionnel)
                </label>
                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  placeholder="Description de la tâche..."
                />
              </div>
              <div>
                <label
                  htmlFor="task-subtasks"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Sous-tâches (optionnel - une par ligne)
                </label>
                <textarea
                  id="task-subtasks"
                  value={subTasksInput}
                  onChange={(event) => setSubTasksInput(event.target.value)}
                  rows={4}
                  className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                  placeholder="Sous-tâche 1&#10;Sous-tâche 2&#10;Sous-tâche 3..."
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Saisis une sous-tâche par ligne. Le pourcentage sera calculé selon les sous-tâches complétées.
                </p>
              </div>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white font-semibold rounded-lg transition shadow-sm hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Création…" : "Créer la tâche"}
              </button>
            </form>
          </section>
          )}

          {/* Liste des tâches */}
          <section className="space-y-6">
            {/* Tâches en attente */}
            {pendingTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">📋 En attente</h2>
                <div className="grid gap-3">
                  {pendingTasks.map((task) => {
                    const isEditing = editingTaskId === task.id;
                    return (
                      <article
                        key={task.id}
                        className="group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm p-4"
                      >
                        {!isEditing ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <button
                                onClick={() => handleToggleStatus(task.id, task.status)}
                                className="flex-shrink-0 w-6 h-6 rounded border-2 border-slate-300 dark:border-slate-600 hover:border-green-500 dark:hover:border-green-400 transition mt-0.5"
                                title="Marquer comme complétée"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">{task.title}</h3>
                                  {task.subTasks.length > 0 && (
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">
                                      {calculateTaskCompletionRate(task)}%
                                    </span>
                                  )}
                                </div>
                                {task.description && (
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
                                )}
                                
                                {/* Sous-tâches */}
                                {task.subTasks.length > 0 && (
                                  <div className="mt-3 space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                    {task.subTasks.map((subTask) => (
                                      <div key={subTask.id} className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleToggleSubTask(task.id, subTask.id)}
                                          className={`flex-shrink-0 w-5 h-5 rounded border-2 transition ${
                                            subTask.completed
                                              ? "bg-green-500 border-green-500 flex items-center justify-center text-white text-xs"
                                              : "border-slate-300 dark:border-slate-600 hover:border-green-500 dark:hover:border-green-400"
                                          }`}
                                          title={subTask.completed ? "Marquer comme non complétée" : "Marquer comme complétée"}
                                        >
                                          {subTask.completed && "✓"}
                                        </button>
                                        <span
                                          className={`text-sm flex-1 ${
                                            subTask.completed
                                              ? "text-slate-500 dark:text-slate-400 line-through"
                                              : "text-slate-700 dark:text-slate-300"
                                          }`}
                                        >
                                          {subTask.text}
                                        </span>
                                        <button
                                          onClick={() => handleDeleteSubTask(task.id, subTask.id)}
                                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 opacity-0 group-hover:opacity-100 transition"
                                          title="Supprimer la sous-tâche"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Barre de progression pour les sous-tâches */}
                                {task.subTasks.length > 0 && (
                                  <div className="mt-2">
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                      <div
                                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-300 rounded-full"
                                        style={{ width: `${calculateTaskCompletionRate(task)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-4 mt-3">
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    <FormattedDate timestamp={task.createdAt} />
                                  </span>
                                  {task.subTasks.length === 0 && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setAddingSubTaskTo(task.id);
                                          setNewSubTaskText("");
                                        }}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                                      >
                                        + Ajouter sous-tâche
                                      </button>
                                    </>
                                  )}
                                  <button
                                    onClick={() => handleCancel(task.id)}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                                    title="Marquer comme non faite"
                                  >
                                    ✕ Annuler
                                  </button>
                                  <button
                                    onClick={() => {
                                      setSharingTaskId(task.id);
                                      setShareUsername("");
                                      setSearchQuery("");
                                      setSearchResults([]);
                                    }}
                                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:underline"
                                    title="Partager cette tâche"
                                  >
                                    🔗 Partager
                                  </button>
                                  <button
                                    onClick={() => startEdit(task)}
                                    className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline"
                                  >
                                    Modifier
                                  </button>
                                  <button
                                    onClick={() => handleDelete(task.id)}
                                    className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                                  >
                                    Supprimer
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Formulaire pour ajouter une sous-tâche */}
                            {addingSubTaskTo === task.id && (
                              <div className="pl-8 flex gap-2">
                                <input
                                  type="text"
                                  value={newSubTaskText}
                                  onChange={(e) => setNewSubTaskText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddSubTask(task.id);
                                    } else if (e.key === "Escape") {
                                      setAddingSubTaskTo(null);
                                      setNewSubTaskText("");
                                    }
                                  }}
                                  className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-2 py-1 text-sm"
                                  placeholder="Nouvelle sous-tâche..."
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleAddSubTask(task.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                                >
                                  Ajouter
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingSubTaskTo(null);
                                    setNewSubTaskText("");
                                  }}
                                  className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-sm hover:bg-slate-300 dark:hover:bg-slate-600"
                                >
                                  Annuler
                                </button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2"
                              placeholder="Titre..."
                            />
                            <textarea
                              value={editDescription}
                              onChange={(e) => setEditDescription(e.target.value)}
                              rows={2}
                              className="w-full rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2"
                              placeholder="Description..."
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdate(task.id)}
                                disabled={loading}
                                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 disabled:opacity-60"
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
              </div>
            )}

            {/* Tâches complétées */}
            {completedTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">✅ Complétées</h2>
                <div className="grid gap-3">
                  {completedTasks.map((task) => (
                    <article
                      key={task.id}
                      className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg shadow-sm p-4"
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleStatus(task.id, task.status)}
                          className="flex-shrink-0 w-6 h-6 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center text-white"
                          title="Marquer comme non complétée"
                        >
                          ✓
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white line-through">
                              {task.title}
                            </h3>
                            {task.subTasks.length > 0 && (
                              <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/40 px-2 py-1 rounded">
                                {calculateTaskCompletionRate(task)}%
                              </span>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-through">
                              {task.description}
                            </p>
                          )}
                          {/* Sous-tâches complétées */}
                          {task.subTasks.length > 0 && (
                            <div className="mt-3 space-y-1 pl-2 border-l-2 border-green-300 dark:border-green-700">
                              {task.subTasks.map((subTask) => (
                                <div key={subTask.id} className="flex items-center gap-2">
                                  <div className="flex-shrink-0 w-5 h-5 rounded border-2 border-green-500 bg-green-500 flex items-center justify-center text-white text-xs">
                                    ✓
                                  </div>
                                  <span className="text-sm text-slate-500 dark:text-slate-400 line-through">
                                    {subTask.text}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              <FormattedDate timestamp={task.updatedAt} />
                            </span>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* Tâches annulées */}
            {cancelledTasks.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">✕ Annulées</h2>
                <div className="grid gap-3">
                  {cancelledTasks.map((task) => (
                    <article
                      key={task.id}
                      className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-sm p-4 opacity-75"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded border-2 border-red-500 bg-red-500 flex items-center justify-center text-white">
                          ✕
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-white line-through">
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-through">
                              {task.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              <FormattedDate timestamp={task.updatedAt} />
                            </span>
                            <button
                              onClick={() => handleToggleStatus(task.id, task.status)}
                              className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:underline"
                            >
                              Réactiver
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:underline"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {tasks.length === 0 && (
              <div className="text-center py-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <p className="text-slate-500 dark:text-slate-400">Aucune tâche pour le moment. Crée ta première tâche !</p>
              </div>
            )}
          </section>

          {/* Tâches partagées avec moi */}
          {sharedTasks.length > 0 && (
            <section className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-200">📥 Tâches partagées avec moi</h2>
              <div className="grid gap-3">
                {sharedTasks.map((task) => (
                  <article
                    key={task.id}
                    className="bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 rounded-lg shadow-sm p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white">{task.title}</h3>
                        {task.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{task.description}</p>
                        )}
                        {task.subTasks.length > 0 && (
                          <div className="mt-2">
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                              {task.subTasks.filter((st) => st.completed).length} / {task.subTasks.length} sous-tâches complétées
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                              <div
                                className="h-full bg-green-500 transition-all duration-300 rounded-full"
                                style={{ width: `${calculateTaskCompletionRate(task)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Modal pour partager une tâche */}
        {sharingTaskId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSharingTaskId(null)}>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Partager la tâche</h3>
                <button
                  onClick={() => setSharingTaskId(null)}
                  className="text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-4">
                {/* Recherche d'utilisateurs */}
                <div>
                  <label htmlFor="search-share-task" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Rechercher un utilisateur
                  </label>
                  <input
                    id="search-share-task"
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
                  <label htmlFor="share-username-task" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Partager avec (pseudo)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="share-username-task"
                      type="text"
                      value={shareUsername}
                      onChange={e => setShareUsername(e.target.value)}
                      placeholder="@pseudo"
                      className="flex-1 rounded-md border border-slate-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-900 dark:focus:ring-slate-400"
                      onKeyPress={e => e.key === "Enter" && handleShareTask(sharingTaskId)}
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
                      onClick={() => handleShareTask(sharingTaskId)}
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

export const getServerSideProps: GetServerSideProps<TasksPageProps> = async (context) => {
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

  // Charger les tâches
  const { getUserTasks, calculateCompletionRate } = await import("@/lib/tasks");
  const tasks = await getUserTasks(session.userId);
  const completionRate = calculateCompletionRate(tasks);

  return {
    props: {
      user: { id: user.id, email: user.email },
      tasks,
      completionRate,
    },
  };
};

