import type { NextApiRequest, NextApiResponse } from "next";
import { getPendingReminders, markReminderAsSent } from "@/lib/reminders";
import { sendReminderEmail } from "@/lib/email";

// Cette route peut être appelée par un cron job pour vérifier et envoyer les rappels
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Protection basique : vérifier une clé secrète si nécessaire
  const secret = req.headers["x-cron-secret"];
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: "Non autorisé" });
  }

  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  try {
    const pendingReminders = await getPendingReminders();
    const results = [];

    for (const reminder of pendingReminders) {
      try {
        await sendReminderEmail(
          reminder.userEmail,
          reminder.noteTitle,
          reminder.noteText,
          new Date(reminder.reminderDate)
        );
        await markReminderAsSent(reminder.id);
        results.push({ reminderId: reminder.id, status: "sent" });
      } catch (error) {
        console.error(`Erreur pour le rappel ${reminder.id}:`, error);
        results.push({ reminderId: reminder.id, status: "error", error: String(error) });
      }
    }

    return res.status(200).json({
      checked: pendingReminders.length,
      sent: results.filter(r => r.status === "sent").length,
      errors: results.filter(r => r.status === "error").length,
      results
    });
  } catch (error) {
    console.error("Erreur lors de la vérification des rappels:", error);
    return res.status(500).json({ error: "Erreur serveur" });
  }
}

