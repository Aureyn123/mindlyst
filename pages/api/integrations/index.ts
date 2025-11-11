import type { NextApiRequest, NextApiResponse } from "next";
import { parseCookies, getSession } from "@/lib/auth";
import {
  getUserIntegrations,
  getIntegration,
  createOrUpdateIntegration,
  deleteIntegration,
  IntegrationType,
} from "@/lib/integrations";

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
    const integrations = await getUserIntegrations(userId);
    return res.status(200).json({ integrations });
  }

  if (req.method === "POST") {
    const { type, enabled, accessToken, refreshToken, config } = req.body as {
      type?: IntegrationType;
      enabled?: boolean;
      accessToken?: string;
      refreshToken?: string;
      config?: Record<string, unknown>;
    };

    if (!type) {
      return res.status(400).json({ error: "Type d'intégration requis" });
    }

    const integration = await createOrUpdateIntegration({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      type,
      enabled: enabled ?? true,
      accessToken,
      refreshToken,
      config,
      createdAt: Date.now(),
    });

    return res.status(200).json({ integration });
  }

  if (req.method === "DELETE") {
    const { type } = req.query as { type?: string };
    if (!type) {
      return res.status(400).json({ error: "Type d'intégration requis" });
    }

    await deleteIntegration(userId, type as IntegrationType);
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Méthode non autorisée" });
}

