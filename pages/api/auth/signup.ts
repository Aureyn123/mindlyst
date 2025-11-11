import type { NextApiRequest, NextApiResponse } from "next";
import crypto from "crypto";
import { hashPassword, readUsers, writeUsers, UserRecord } from "@/lib/auth";

type SignupBody = {
  email?: string;
  username?: string;
  password?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { email, username, password } = req.body as SignupBody;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Email, pseudo et mot de passe requis" });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Le mot de passe doit contenir au moins 8 caractères" });
  }

  const normalizedUsername = username.trim();
  if (normalizedUsername.length < 3 || normalizedUsername.length > 20) {
    return res.status(400).json({ error: "Le pseudo doit contenir entre 3 et 20 caractères" });
  }

  // Vérifier que le pseudo ne contient que des caractères alphanumériques et des underscores
  if (!/^[a-zA-Z0-9_]+$/.test(normalizedUsername)) {
    return res.status(400).json({ error: "Le pseudo ne peut contenir que des lettres, chiffres et underscores" });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const users = await readUsers();

  if (users.some(user => user.email === normalizedEmail)) {
    return res.status(409).json({ error: "Cet email est déjà enregistré" });
  }

  if (users.some(user => user.username?.toLowerCase() === normalizedUsername.toLowerCase())) {
    return res.status(409).json({ error: "Ce pseudo est déjà pris" });
  }

  const newUser: UserRecord = {
    id: crypto.randomUUID(),
    email: normalizedEmail,
    username: normalizedUsername,
    passwordHash: hashPassword(password),
    createdAt: Date.now()
  };

  await writeUsers([...users, newUser]);

  return res.status(201).json({ success: true });
}

