import type { NextApiRequest, NextApiResponse } from "next";
import {
  createSession,
  deleteSession,
  parseCookies,
  readUsers,
  verifyPassword
} from "@/lib/auth";

type LoginBody = {
  email?: string;
  password?: string;
};

const COOKIE_NAME = "mindlyst_session";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { email, password } = req.body as LoginBody;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  const users = await readUsers();
  const user = users.find(u => u.email === email.toLowerCase().trim());

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }

  const cookies = parseCookies(req);
  const existingToken = cookies[COOKIE_NAME];
  if (existingToken) {
    await deleteSession(existingToken);
  }

  const session = await createSession(user.id);
  const cookieParts = [
    `${COOKIE_NAME}=${session.token}`,
    "HttpOnly",
    "Path=/",
    `Max-Age=${MAX_AGE_SECONDS}`,
    "SameSite=Lax"
  ];
  if (process.env.NODE_ENV === "production") {
    cookieParts.push("Secure");
  }

  res.setHeader("Set-Cookie", cookieParts.join("; "));
  return res.status(200).json({ success: true });
}

