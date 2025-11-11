// Fonctions utilitaires pour Google Calendar
import { getIntegration } from "./integrations";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export async function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google Calendar not configured");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function createGoogleCalendarEvent(
  userId: string,
  title: string,
  description: string,
  startTime: string,
  endTime: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const integration = await getIntegration(userId, "google_calendar");
  if (!integration || !integration.accessToken) {
    return { success: false, error: "Google Calendar non connecté" };
  }

  try {
    // Vérifier et rafraîchir le token si nécessaire
    let accessToken = integration.accessToken;
    if (integration.expiresAt && integration.expiresAt < Date.now() && integration.refreshToken) {
      accessToken = await refreshAccessToken(integration.refreshToken);
      // Mettre à jour le token dans la base de données
      const { createOrUpdateIntegration } = await import("./integrations");
      await createOrUpdateIntegration({
        ...integration,
        accessToken,
        expiresAt: Date.now() + 3600 * 1000, // 1 heure
      });
    }

    // Créer l'événement dans Google Calendar
    const event = {
      summary: title,
      description: description || "",
      start: {
        dateTime: new Date(startTime).toISOString(),
        timeZone: "Europe/Paris",
      },
      end: {
        dateTime: new Date(endTime).toISOString(),
        timeZone: "Europe/Paris",
      },
    };

    const calendarResponse = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!calendarResponse.ok) {
      const error = await calendarResponse.json();
      throw new Error(error.error?.message || "Failed to create event");
    }

    const eventData = await calendarResponse.json();
    return { success: true, eventId: eventData.id };
  } catch (error) {
    console.error("Erreur lors de la création de l'événement:", error);
    return { success: false, error: error instanceof Error ? error.message : "Erreur inconnue" };
  }
}

