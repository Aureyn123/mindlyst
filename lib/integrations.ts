// Gestion des intégrations avec services externes
import { readJson, writeJson } from "./db";

export type IntegrationType = "google_calendar" | "apple_calendar" | "notion";

export type Integration = {
  id: string;
  userId: string;
  type: IntegrationType;
  enabled: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  config?: Record<string, unknown>;
  createdAt: number;
};

const INTEGRATIONS_FILE = "integrations.json";

export async function loadIntegrations(): Promise<Integration[]> {
  return await readJson<Integration[]>(INTEGRATIONS_FILE, []);
}

export async function saveIntegrations(integrations: Integration[]): Promise<void> {
  await writeJson(INTEGRATIONS_FILE, integrations);
}

export async function getUserIntegrations(userId: string): Promise<Integration[]> {
  const integrations = await loadIntegrations();
  return integrations.filter((i) => i.userId === userId);
}

export async function getIntegration(userId: string, type: IntegrationType): Promise<Integration | null> {
  const integrations = await getUserIntegrations(userId);
  return integrations.find((i) => i.type === type && i.enabled) || null;
}

export async function createOrUpdateIntegration(integration: Integration): Promise<Integration> {
  const integrations = await loadIntegrations();
  const existingIndex = integrations.findIndex(
    (i) => i.userId === integration.userId && i.type === integration.type
  );

  if (existingIndex >= 0) {
    integrations[existingIndex] = integration;
  } else {
    integrations.push(integration);
  }

  await saveIntegrations(integrations);
  return integration;
}

export async function deleteIntegration(userId: string, type: IntegrationType): Promise<void> {
  const integrations = await loadIntegrations();
  const filtered = integrations.filter((i) => !(i.userId === userId && i.type === type));
  await saveIntegrations(filtered);
}

// Détection de dates dans le texte
export function detectDatesInText(text: string): Array<{ date: Date; text: string }> {
  const dates: Array<{ date: Date; text: string }> = [];
  const now = new Date();

  // Patterns de dates courants
  const patterns = [
    // Format français : "le 15 janvier 2024 à 14h30"
    /(?:le\s+)?(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})(?:\s+à\s+(\d{1,2})h(?:(\d{2}))?)?/gi,
    // Format : "15/01/2024 14:30"
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/g,
    // Format : "2024-01-15 14:30"
    /(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/g,
    // Format relatif : "demain à 14h", "dans 3 jours à 10h"
    /(?:demain|après-demain)(?:\s+à\s+(\d{1,2})h(?:(\d{2}))?)?/gi,
    /dans\s+(\d+)\s+jours?(?:\s+à\s+(\d{1,2})h(?:(\d{2}))?)?/gi,
  ];

  const monthNames = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre"
  ];

  // Pattern 1 : Format français
  let match: RegExpExecArray | null = null;
  const pattern1 = /(?:le\s+)?(\d{1,2})\s+(janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+(\d{4})(?:\s+à\s+(\d{1,2})h(?:(\d{2}))?)?/gi;
  while ((match = pattern1.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const month = monthNames.findIndex(m => m.toLowerCase() === match[2].toLowerCase());
    const year = parseInt(match[3]);
    const hour = match[4] ? parseInt(match[4]) : 9;
    const minute = match[5] ? parseInt(match[5]) : 0;

    if (month >= 0) {
      const date = new Date(year, month, day, hour, minute);
      dates.push({ date, text: match[0] });
    }
  }

  // Pattern 2 : Format DD/MM/YYYY
  const pattern2 = /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/g;
  while ((match = pattern2.exec(text)) !== null) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = parseInt(match[3]);
    const hour = match[4] ? parseInt(match[4]) : 9;
    const minute = match[5] ? parseInt(match[5]) : 0;

    const date = new Date(year, month, day, hour, minute);
    dates.push({ date, text: match[0] });
  }

  // Pattern 3 : Format YYYY-MM-DD
  const pattern3 = /(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/g;
  while ((match = pattern3.exec(text)) !== null) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const day = parseInt(match[3]);
    const hour = match[4] ? parseInt(match[4]) : 9;
    const minute = match[5] ? parseInt(match[5]) : 0;

    const date = new Date(year, month, day, hour, minute);
    dates.push({ date, text: match[0] });
  }

  // Pattern 4 : Demain
  const pattern4 = /demain(?:\s+à\s+(\d{1,2})h(?:(\d{2}))?)?/gi;
  while ((match = pattern4.exec(text)) !== null) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const hour = match[1] ? parseInt(match[1]) : 9;
    const minute = match[2] ? parseInt(match[2]) : 0;
    tomorrow.setHours(hour, minute, 0, 0);
    dates.push({ date: tomorrow, text: match[0] });
  }

  // Pattern 5 : Dans X jours
  const pattern5 = /dans\s+(\d+)\s+jours?(?:\s+à\s+(\d{1,2})h(?:(\d{2}))?)?/gi;
  while ((match = pattern5.exec(text)) !== null) {
    const days = parseInt(match[1]);
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + days);
    const hour = match[2] ? parseInt(match[2]) : 9;
    const minute = match[3] ? parseInt(match[3]) : 0;
    futureDate.setHours(hour, minute, 0, 0);
    dates.push({ date: futureDate, text: match[0] });
  }

  // Filtrer les dates passées et trier
  return dates
    .filter((d) => d.date > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

