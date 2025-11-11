import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession, readUsers, writeUsers } from "@/lib/auth";

const COOKIE_NAME = "mindlyst_session";
const DEFAULT_CATEGORIES = ["business", "perso", "sport", "clients", "autres"];

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
    const users = await readUsers();
    const user = users.find((u) => u.id === userId);
    const customCategories = user?.customCategories || [];
    const allCategories = [...DEFAULT_CATEGORIES, ...customCategories];
    return res.status(200).json({ categories: allCategories, customCategories });
  }

  if (req.method === "POST") {
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Le nom de la catégorie est requis" });
    }

    const trimmedName = name.trim().toLowerCase();
    if (trimmedName.length > 30) {
      return res.status(400).json({ error: "Le nom de la catégorie ne peut pas dépasser 30 caractères" });
    }

    const users = await readUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const customCategories = user.customCategories || [];
    
    // Vérifier si la catégorie existe déjà (dans les défautes ou personnalisées)
    if (DEFAULT_CATEGORIES.includes(trimmedName) || customCategories.includes(trimmedName)) {
      return res.status(400).json({ error: "Cette catégorie existe déjà" });
    }

    customCategories.push(trimmedName);
    user.customCategories = customCategories;
    await writeUsers(users);

    return res.status(200).json({ success: true, categories: [...DEFAULT_CATEGORIES, ...customCategories] });
  }

  if (req.method === "DELETE") {
    const { name } = req.body as { name?: string };
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "Le nom de la catégorie est requis" });
    }

    const trimmedName = name.trim().toLowerCase();

    // Ne pas permettre la suppression des catégories par défaut
    if (DEFAULT_CATEGORIES.includes(trimmedName)) {
      return res.status(400).json({ error: "Impossible de supprimer une catégorie par défaut" });
    }

    const users = await readUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const customCategories = user.customCategories || [];
    const index = customCategories.indexOf(trimmedName);
    if (index === -1) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    customCategories.splice(index, 1);
    user.customCategories = customCategories;
    await writeUsers(users);

    return res.status(200).json({ success: true, categories: [...DEFAULT_CATEGORIES, ...customCategories] });
  }

  if (req.method === "PUT") {
    const { oldName, newName } = req.body as { oldName?: string; newName?: string };
    if (!oldName || !newName || typeof oldName !== "string" || typeof newName !== "string") {
      return res.status(400).json({ error: "Les noms ancien et nouveau sont requis" });
    }

    const trimmedOldName = oldName.trim().toLowerCase();
    const trimmedNewName = newName.trim().toLowerCase();

    if (trimmedNewName.length > 30) {
      return res.status(400).json({ error: "Le nom de la catégorie ne peut pas dépasser 30 caractères" });
    }

    // Ne pas permettre la modification des catégories par défaut
    if (DEFAULT_CATEGORIES.includes(trimmedOldName)) {
      return res.status(400).json({ error: "Impossible de modifier une catégorie par défaut" });
    }

    const users = await readUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const customCategories = user.customCategories || [];
    const index = customCategories.indexOf(trimmedOldName);
    if (index === -1) {
      return res.status(404).json({ error: "Catégorie non trouvée" });
    }

    // Vérifier si le nouveau nom existe déjà
    if (DEFAULT_CATEGORIES.includes(trimmedNewName) || customCategories.includes(trimmedNewName)) {
      return res.status(400).json({ error: "Cette catégorie existe déjà" });
    }

    customCategories[index] = trimmedNewName;
    user.customCategories = customCategories;
    await writeUsers(users);

    // Mettre à jour toutes les notes qui utilisent l'ancienne catégorie
    const { readJson, writeJson } = await import("@/lib/db");
    const notes = await readJson<any[]>("notes.json", []);
    notes.forEach((note) => {
      if (note.userId === userId && note.category === trimmedOldName) {
        note.category = trimmedNewName;
      }
    });
    await writeJson("notes.json", notes);

    return res.status(200).json({ success: true, categories: [...DEFAULT_CATEGORIES, ...customCategories] });
  }

  res.setHeader("Allow", "GET, POST, PUT, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

