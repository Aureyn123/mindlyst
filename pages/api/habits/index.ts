import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import {
  getUserHabits,
  createHabit,
  updateHabit,
  deleteHabit,
  getWeeklyStats,
  resetDailyHabits,
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

  // Réinitialiser les habitudes si nécessaire (vérification quotidienne)
  await resetDailyHabits();

  if (req.method === "GET") {
    const { stats } = req.query as { stats?: string };
    
    if (stats === "weekly") {
      const habits = await getUserHabits(userId);
      const weeklyStats = getWeeklyStats(habits);
      return res.status(200).json(weeklyStats);
    }
    
    const habits = await getUserHabits(userId);
    const today = getTodayDateString();
    const weeklyStats = getWeeklyStats(habits);
    
    return res.status(200).json({
      habits,
      today,
      weeklyStats,
    });
  }

  if (req.method === "POST") {
    const { name, description, color } = req.body as {
      name?: string;
      description?: string;
      color?: string;
    };
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Nom requis" });
    }
    const habit = await createHabit(userId, name, description, color);
    const habits = await getUserHabits(userId);
    const weeklyStats = getWeeklyStats(habits);
    return res.status(201).json({ habit, weeklyStats });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

