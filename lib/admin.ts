// Système de codes admin pour le développement et les tests
import { readUsers, writeUsers } from "./auth";

// Code admin par défaut (à changer en production !)
const ADMIN_CODE = process.env.ADMIN_CODE || "MINDLYST_ADMIN_2025";

export async function verifyAdminCode(code: string): Promise<boolean> {
  return code === ADMIN_CODE;
}

export async function activateAdminForUser(userId: string): Promise<void> {
  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  if (user) {
    user.isAdmin = true;
    await writeUsers(users);
  }
}

export async function isUserAdmin(userId: string): Promise<boolean> {
  const users = await readUsers();
  const user = users.find((u) => u.id === userId);
  return user?.isAdmin === true;
}

