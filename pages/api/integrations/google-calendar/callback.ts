import type { NextApiRequest, NextApiResponse } from "next";
import { createOrUpdateIntegration } from "@/lib/integrations";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/integrations/google-calendar/callback";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { code, state: userId, error } = req.query as { code?: string; state?: string; error?: string };

  if (error) {
    return res.redirect(`/dashboard?integration_error=${encodeURIComponent(error)}`);
  }

  if (!code || !userId) {
    return res.redirect("/dashboard?integration_error=missing_code");
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect("/dashboard?integration_error=not_configured");
  }

  try {
    // Échanger le code contre un access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : undefined;

    // Sauvegarder l'intégration
    await createOrUpdateIntegration({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type: "google_calendar",
      enabled: true,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      createdAt: Date.now(),
    });

    return res.redirect("/dashboard?integration_success=google_calendar");
  } catch (error) {
    console.error("Erreur lors de la connexion Google Calendar:", error);
    return res.redirect("/dashboard?integration_error=connection_failed");
  }
}

