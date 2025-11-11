import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import { getUserContacts, addContact, removeContact, searchUsersByUsername, createContactRequest, getPendingContactRequests } from "@/lib/contacts";

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
    const { search, type } = req.query as { search?: string; type?: string };
    
    if (type === "requests") {
      // Récupérer les demandes en attente
      const requests = await getPendingContactRequests(userId);
      return res.status(200).json({ requests });
    }
    
    if (search) {
      // Recherche d'utilisateurs par pseudo
      const results = await searchUsersByUsername(search, userId);
      return res.status(200).json({ users: results });
    }
    
    // Récupérer les contacts de l'utilisateur
    const contacts = await getUserContacts(userId);
    return res.status(200).json({ contacts });
  }

  if (req.method === "POST") {
    const { contactUserId, action } = req.body as { contactUserId?: string; action?: string };
    
    // Si action = "request", créer une demande de contact
    if (action === "request") {
      if (!contactUserId || typeof contactUserId !== "string") {
        return res.status(400).json({ error: "ID du contact requis" });
      }

      try {
        const request = await createContactRequest(userId, contactUserId);
        return res.status(201).json({ request, message: "Demande de contact envoyée" });
      } catch (error: any) {
        return res.status(400).json({ error: error.message || "Erreur lors de l'envoi de la demande" });
      }
    }

    // Sinon, comportement par défaut (pour rétrocompatibilité)
    if (!contactUserId || typeof contactUserId !== "string") {
      return res.status(400).json({ error: "ID du contact requis" });
    }

    try {
      const contact = await addContact(userId, contactUserId);
      const contacts = await getUserContacts(userId);
      return res.status(201).json({ contact, contacts });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || "Erreur lors de l'ajout du contact" });
    }
  }

  if (req.method === "DELETE") {
    const { contactId } = req.body as { contactId?: string };
    if (!contactId || typeof contactId !== "string") {
      return res.status(400).json({ error: "ID du contact requis" });
    }

    const deleted = await removeContact(userId, contactId);
    if (!deleted) {
      return res.status(404).json({ error: "Contact non trouvé" });
    }

    const contacts = await getUserContacts(userId);
    return res.status(200).json({ success: true, contacts });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

