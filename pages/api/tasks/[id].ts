import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import {
  updateTaskStatus,
  updateTask,
  deleteTask,
  getUserTasks,
  calculateCompletionRate,
  addSubTask,
  toggleSubTask,
  deleteSubTask,
  updateSubTask,
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

  const { id } = req.query;
  if (typeof id !== "string") {
    return res.status(400).json({ error: "ID de tâche invalide" });
  }

  if (req.method === "PUT") {
    const {
      status,
      title,
      description,
      action,
      subTaskText,
      subTaskId,
      newSubTaskText,
    } = req.body as {
      status?: "pending" | "completed" | "cancelled";
      title?: string;
      description?: string;
      action?: "addSubTask" | "toggleSubTask" | "deleteSubTask" | "updateSubTask";
      subTaskText?: string;
      subTaskId?: string;
      newSubTaskText?: string;
    };

    // Gestion des sous-tâches
    if (action === "addSubTask" && subTaskText) {
      const updated = await addSubTask(id, userId, subTaskText);
      if (!updated) {
        return res.status(404).json({ error: "Tâche non trouvée" });
      }
      const tasks = await getUserTasks(userId);
      const completionRate = calculateCompletionRate(tasks);
      return res.status(200).json({ task: updated, completionRate });
    }

    if (action === "toggleSubTask" && subTaskId) {
      const updated = await toggleSubTask(id, userId, subTaskId);
      if (!updated) {
        return res.status(404).json({ error: "Tâche ou sous-tâche non trouvée" });
      }
      const tasks = await getUserTasks(userId);
      const completionRate = calculateCompletionRate(tasks);
      return res.status(200).json({ task: updated, completionRate });
    }

    if (action === "deleteSubTask" && subTaskId) {
      const updated = await deleteSubTask(id, userId, subTaskId);
      if (!updated) {
        return res.status(404).json({ error: "Tâche ou sous-tâche non trouvée" });
      }
      const tasks = await getUserTasks(userId);
      const completionRate = calculateCompletionRate(tasks);
      return res.status(200).json({ task: updated, completionRate });
    }

    if (action === "updateSubTask" && subTaskId && newSubTaskText) {
      const updated = await updateSubTask(id, userId, subTaskId, newSubTaskText);
      if (!updated) {
        return res.status(404).json({ error: "Tâche ou sous-tâche non trouvée" });
      }
      return res.status(200).json({ task: updated });
    }

    // Gestion du statut principal
    if (status !== undefined) {
      const updated = await updateTaskStatus(id, userId, status);
      if (!updated) {
        return res.status(404).json({ error: "Tâche non trouvée" });
      }
      const tasks = await getUserTasks(userId);
      const completionRate = calculateCompletionRate(tasks);
      return res.status(200).json({ task: updated, completionRate });
    }

    // Gestion du titre et description
    if (title !== undefined || description !== undefined) {
      const updated = await updateTask(id, userId, { title, description });
      if (!updated) {
        return res.status(404).json({ error: "Tâche non trouvée" });
      }
      return res.status(200).json({ task: updated });
    }

    return res.status(400).json({ error: "Paramètres requis manquants" });
  }

  if (req.method === "DELETE") {
    const deleted = await deleteTask(id, userId);
    if (!deleted) {
      return res.status(404).json({ error: "Tâche non trouvée" });
    }
    const tasks = await getUserTasks(userId);
    const completionRate = calculateCompletionRate(tasks);
    return res.status(200).json({ success: true, completionRate });
  }

  res.setHeader("Allow", "PUT, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

