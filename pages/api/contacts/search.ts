import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { findUserByUsername } from "@/lib/contacts";

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

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { username } = req.query as { username?: string };
  if (!username || typeof username !== "string") {
    return res.status(400).json({ error: "Pseudo requis" });
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return res.status(404).json({ error: "Utilisateur non trouvé" });
  }

  return res.status(200).json({ user });
}

