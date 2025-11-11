import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { summarizeNote, summarizeWithAI } from "@/lib/ai-assistant";

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

  const { text, useAI } = req.body as { text?: string; useAI?: boolean };

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Texte requis" });
  }

  try {
    const summary = useAI ? await summarizeWithAI(text) : await summarizeNote(text);
    return res.status(200).json({ summary });
  } catch (error) {
    console.error("Erreur lors du résumé:", error);
    return res.status(500).json({ error: "Erreur lors du résumé de la note" });
  }
}

