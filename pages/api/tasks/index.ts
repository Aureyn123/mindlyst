import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import {
  getUserTasks,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
  calculateCompletionRate,
} from "@/lib/tasks";

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
    const tasks = await getUserTasks(userId);
    const completionRate = calculateCompletionRate(tasks);
    return res.status(200).json({ tasks, completionRate });
  }

  if (req.method === "POST") {
    const { title, description, subTasks } = req.body as {
      title?: string;
      description?: string;
      subTasks?: string[];
    };
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ error: "Titre requis" });
    }
    const task = await createTask(userId, title, description, subTasks);
    const tasks = await getUserTasks(userId);
    const completionRate = calculateCompletionRate(tasks);
    return res.status(201).json({ task, completionRate });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

