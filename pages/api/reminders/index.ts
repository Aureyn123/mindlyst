import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession, readUsers } from "@/lib/auth";
import { createReminder, getUserReminders, deleteReminder, loadReminders } from "@/lib/reminders";

const COOKIE_NAME = "mindlyst_session";

async function getAuthenticatedUserId(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const session = await getSession(token);
  return session?.userId ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  if (req.method === "GET") {
    const reminders = await getUserReminders(userId);
    return res.status(200).json({ reminders });
  }

  if (req.method === "POST") {
    const { noteId, reminderDate } = req.body as { noteId?: string; reminderDate?: number };
    if (!noteId || !reminderDate) {
      return res.status(400).json({ error: "noteId et reminderDate requis" });
    }

    // Vérifier que la note appartient à l'utilisateur
    const { readJson } = await import("@/lib/db");
    const notes = await readJson<any[]>("notes.json", []);
    const note = notes.find(n => n.id === noteId && n.userId === userId);
    if (!note) {
      return res.status(404).json({ error: "Note introuvable" });
    }

    // Récupérer l'email de l'utilisateur
    const users = await readUsers();
    const user = users.find(u => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur introuvable" });
    }

    // Vérifier qu'il n'y a pas déjà un rappel actif pour cette note
    const existingReminders = await getUserReminders(userId);
    const existing = existingReminders.find(r => r.noteId === noteId);
    if (existing) {
      return res.status(400).json({ error: "Un rappel existe déjà pour cette note" });
    }

    const reminder = await createReminder({
      noteId,
      userId,
      userEmail: user.email,
      noteTitle: note.title,
      noteText: note.text,
      reminderDate
    });

    return res.status(201).json({ reminder });
  }

  if (req.method === "DELETE") {
    const { reminderId } = req.body as { reminderId?: string };
    if (!reminderId) {
      return res.status(400).json({ error: "reminderId requis" });
    }

    // Vérifier que le rappel appartient à l'utilisateur
    const reminders = await loadReminders();
    const reminder = reminders.find(r => r.id === reminderId && r.userId === userId);
    if (!reminder) {
      return res.status(404).json({ error: "Rappel introuvable" });
    }

    await deleteReminder(reminderId);
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

