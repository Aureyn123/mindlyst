import crypto from "crypto";
import type { NextApiRequest } from "next";
import { readJson, writeJson } from "./db";

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type UserRecord = {
  id: string;
  email: string;
  username: string; // Pseudo unique
  passwordHash: string;
  createdAt: number;
  isAdmin?: boolean;
  customCategories?: string[];
};

export type SessionRecord = {
  token: string;
  userId: string;
  expiresAt: number;
};

const USERS_FILE = "users.json";
const SESSIONS_FILE = "sessions.json";

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString("hex");
  return `${salt}:${ITERATIONS}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, iterString, originalHash] = storedHash.split(":");
  const iterations = Number(iterString);
  if (!salt || !iterations || !originalHash) {
    return false;
  }
  const derived = crypto.pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(derived, "hex"), Buffer.from(originalHash, "hex"));
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function parseCookies(req: NextApiRequest | { headers: { cookie?: string } }): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  return header.split(";").reduce<Record<string, string>>((acc, pair) => {
    const [key, value] = pair.split("=").map(part => part?.trim());
    if (key) acc[key] = decodeURIComponent(value ?? "");
    return acc;
  }, {});
}

export async function readUsers(): Promise<UserRecord[]> {
  return readJson<UserRecord[]>(USERS_FILE, []);
}

export async function writeUsers(users: UserRecord[]): Promise<void> {
  await writeJson(USERS_FILE, users);
}

export async function readSessions(): Promise<SessionRecord[]> {
  const sessions = await readJson<SessionRecord[]>(SESSIONS_FILE, []);
  const now = Date.now();
  const active = sessions.filter(session => session.expiresAt > now);
  if (active.length !== sessions.length) {
    await writeJson(SESSIONS_FILE, active);
  }
  return active;
}

export async function writeSessions(sessions: SessionRecord[]): Promise<void> {
  await writeJson(SESSIONS_FILE, sessions);
}

export async function getSession(token: string): Promise<SessionRecord | undefined> {
  const sessions = await readSessions();
  return sessions.find(session => session.token === token);
}

export async function createSession(userId: string): Promise<SessionRecord> {
  const token = generateSessionToken();
  const session: SessionRecord = {
    token,
    userId,
    expiresAt: Date.now() + SESSION_DURATION_MS
  };
  const sessions = await readSessions();
  sessions.push(session);
  await writeSessions(sessions);
  return session;
}

export async function deleteSession(token: string): Promise<void> {
  const sessions = await readSessions();
  const filtered = sessions.filter(session => session.token !== token);
  await writeSessions(filtered);
}

