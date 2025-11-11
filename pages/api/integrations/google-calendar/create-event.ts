import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { createGoogleCalendarEvent } from "@/lib/google-calendar";

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

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { title, description, startTime, endTime } = req.body as {
    title?: string;
    description?: string;
    startTime?: string;
    endTime?: string;
  };

  if (!title || !startTime) {
    return res.status(400).json({ error: "Titre et heure de début requis" });
  }

  const result = await createGoogleCalendarEvent(
    userId,
    title,
    description || "",
    startTime,
    endTime || new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString()
  );

  if (!result.success) {
    return res.status(500).json({ error: result.error || "Erreur inconnue" });
  }

  return res.status(200).json({ success: true, eventId: result.eventId });
}

