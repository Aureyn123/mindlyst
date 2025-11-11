import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { getUserSubscription, getNotesCreatedToday, PLAN_LIMITS } from "@/lib/subscription";
import { isUserAdmin } from "@/lib/admin";

const COOKIE_NAME = "mindlyst_session";

async function getAuthenticatedUserId(req: NextApiRequest): Promise<string | null> {
  const cookies = parseCookies(req);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  const session = await getSession(token);
  return session?.userId ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const userId = await getAuthenticatedUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const adminStatus = await isUserAdmin(userId);
  const subscription = await getUserSubscription(userId);
  const plan = subscription?.plan || "free";
  const limit = PLAN_LIMITS[plan].maxNotesPerDay;
  const notesToday = await getNotesCreatedToday(userId);
  const notesRemainingToday = adminStatus ? Infinity : Math.max(0, limit - notesToday);

  return res.status(200).json({
    plan,
    notesToday,
    notesRemainingToday: adminStatus ? Infinity : notesRemainingToday,
    limit: adminStatus ? Infinity : limit,
    isAdmin: adminStatus,
  });
}

