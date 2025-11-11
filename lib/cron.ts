// Système de cron pour vérifier les rappels automatiquement
// Note: Ce fichier doit être importé dans _app.tsx ou un fichier de démarrage

import cron from "node-cron";
import { getPendingReminders, markReminderAsSent } from "./reminders";
import { sendReminderEmail } from "./email";

let cronJob: cron.ScheduledTask | null = null;

export function startReminderCron() {
  if (cronJob) {
    console.log("⚠️  Cron job déjà démarré");
    return;
  }

  // Vérifie les rappels toutes les minutes
  cronJob = cron.schedule("* * * * *", async () => {
    try {
      const pendingReminders = await getPendingReminders();
      if (pendingReminders.length === 0) {
        return;
      }

      console.log(`📋 Vérification des rappels: ${pendingReminders.length} en attente`);

      for (const reminder of pendingReminders) {
        try {
          await sendReminderEmail(
            reminder.userEmail,
            reminder.noteTitle,
            reminder.noteText,
            new Date(reminder.reminderDate)
          );
          await markReminderAsSent(reminder.id);
          console.log(`✅ Rappel envoyé à ${reminder.userEmail}`);
        } catch (error) {
          console.error(`❌ Erreur pour le rappel ${reminder.id}:`, error);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la vérification des rappels:", error);
    }
  });

  console.log("✅ Cron job pour les rappels démarré (vérification toutes les minutes)");
}

export function stopReminderCron() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("⏹️  Cron job arrêté");
  }
}

