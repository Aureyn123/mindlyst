import type { NextApiRequest, NextApiResponse } from "next";
import { deleteSession, parseCookies } from "@/lib/auth";

const COOKIE_NAME = "mindlyst_session";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (token) {
    await deleteSession(token);
  }

  const expiredCookie = [
    `${COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "Max-Age=0",
    "SameSite=Lax"
  ];
  if (process.env.NODE_ENV === "production") {
    expiredCookie.push("Secure");
  }

  res.setHeader("Set-Cookie", expiredCookie.join("; "));
  return res.status(200).json({ success: true });
}

