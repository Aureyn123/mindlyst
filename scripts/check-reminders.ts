// Script pour vérifier et envoyer les rappels
// Peut être exécuté via cron ou appelé périodiquement

import { getPendingReminders, markReminderAsSent } from "../lib/reminders";
import { sendReminderEmail } from "../lib/email";

async function checkAndSendReminders() {
  try {
    const pendingReminders = await getPendingReminders();
    console.log(`📋 ${pendingReminders.length} rappel(s) en attente`);

    for (const reminder of pendingReminders) {
      try {
        await sendReminderEmail(
          reminder.userEmail,
          reminder.noteTitle,
          reminder.noteText,
          new Date(reminder.reminderDate)
        );
        await markReminderAsSent(reminder.id);
        console.log(`✅ Rappel envoyé à ${reminder.userEmail} pour la note "${reminder.noteTitle}"`);
      } catch (error) {
        console.error(`❌ Erreur pour le rappel ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des rappels:", error);
    process.exit(1);
  }
}

checkAndSendReminders();

