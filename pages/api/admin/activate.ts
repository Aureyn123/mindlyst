import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { verifyAdminCode, activateAdminForUser } from "@/lib/admin";

const COOKIE_NAME = "mindlyst_session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const session = await getSession(token);
  if (!session) {
    return res.status(401).json({ error: "Session expirée" });
  }

  const { code } = req.body as { code?: string };
  if (!code) {
    return res.status(400).json({ error: "Code requis" });
  }

  const isValid = await verifyAdminCode(code);
  if (!isValid) {
    return res.status(403).json({ error: "Code invalide" });
  }

  await activateAdminForUser(session.userId);
  return res.status(200).json({ success: true, message: "Mode admin activé !" });
}

