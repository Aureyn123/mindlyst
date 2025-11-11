import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import {
  updateHabitStatus,
  updateHabit,
  deleteHabit,
  getUserHabits,
  getWeeklyStats,
  getTodayDateString,
} from "@/lib/habits";

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

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "ID d'habitude invalide" });
  }

  if (req.method === "PUT") {
    const { status, date, name, description, color } = req.body as {
      status?: "completed" | "skipped" | "pending";
      date?: string;
      name?: string;
      description?: string;
      color?: string;
    };

    // Mise à jour du statut quotidien
    if (status !== undefined && date !== undefined) {
      const updated = await updateHabitStatus(id, userId, date, status);
      if (!updated) {
        return res.status(404).json({ error: "Habitude non trouvée" });
      }
      const habits = await getUserHabits(userId);
      const weeklyStats = getWeeklyStats(habits);
      return res.status(200).json({ habit: updated, weeklyStats });
    }

    // Mise à jour des informations de l'habitude
    if (name !== undefined || description !== undefined || color !== undefined) {
      const updated = await updateHabit(id, userId, { name, description, color });
      if (!updated) {
        return res.status(404).json({ error: "Habitude non trouvée" });
      }
      return res.status(200).json({ habit: updated });
    }

    return res.status(400).json({ error: "status+date ou name/description/color requis" });
  }

  if (req.method === "DELETE") {
    const deleted = await deleteHabit(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: "Habitude non trouvée" });
    }
    const habits = await getUserHabits(userId);
    const weeklyStats = getWeeklyStats(habits);
    return res.status(200).json({ success: true, weeklyStats });
  }

  res.setHeader("Allow", "PUT, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

