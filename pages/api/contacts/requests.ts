import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { acceptContactRequest, rejectContactRequest, getPendingContactRequests, getUserContacts } from "@/lib/contacts";

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
    const requests = await getPendingContactRequests(userId);
    return res.status(200).json({ requests });
  }

  if (req.method === "POST") {
    const { requestId, action } = req.body as { requestId?: string; action?: "accept" | "reject" };
    
    if (!requestId || typeof requestId !== "string") {
      return res.status(400).json({ error: "ID de la demande requis" });
    }

    if (!action || (action !== "accept" && action !== "reject")) {
      return res.status(400).json({ error: "Action invalide (accept ou reject requis)" });
    }

    try {
      if (action === "accept") {
        const contact = await acceptContactRequest(requestId, userId);
        const contacts = await getUserContacts(userId);
        return res.status(200).json({ success: true, contact, contacts });
      } else {
        await rejectContactRequest(requestId, userId);
        return res.status(200).json({ success: true, message: "Demande refusée" });
      }
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Erreur lors du traitement de la demande" });
    }
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

