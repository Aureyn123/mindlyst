// Serveur Next.js avec cron job pour les rappels
// Utilisez ce fichier au lieu de "next dev" pour avoir les rappels automatiques
// node server.js

// Charger les variables d'environnement
require("dotenv").config({ path: ".env.local" });

const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const cron = require("node-cron");
const fs = require("fs").promises;
const path = require("path");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Fonction pour charger et envoyer les rappels
async function checkAndSendReminders() {
  try {
    // Charger dynamiquement les fonctions TypeScript
    const { getPendingReminders, markReminderAsSent } = await import("./lib/reminders.js");
    const { sendReminderEmail } = await import("./lib/email.js");
    const { readJson, writeJson } = await import("./lib/db.js");

    const pendingReminders = await getPendingReminders();

    if (pendingReminders.length === 0) return;

    console.log(`📋 ${pendingReminders.length} rappel(s) à envoyer`);

    for (const reminder of pendingReminders) {
      try {
        // Envoyer l'email de rappel
        await sendReminderEmail(
          reminder.userEmail,
          reminder.noteTitle,
          reminder.noteText,
          new Date(reminder.reminderDate)
        );

        // Créer automatiquement une note "urgent" pour ce rappel
        const notes = await readJson("notes.json", []);
        const { randomUUID } = await import("crypto");
        const urgentNote = {
          id: randomUUID(),
          userId: reminder.userId,
          title: `🔴 URGENT: ${reminder.noteTitle}`,
          text: `Rappel pour: ${reminder.noteTitle}\n\n${reminder.noteText}\n\nDate du rappel: ${new Date(reminder.reminderDate).toLocaleString("fr-FR")}`,
          category: "urgent",
          createdAt: Date.now(),
        };
        notes.push(urgentNote);
        await writeJson("notes.json", notes);

        await markReminderAsSent(reminder.id);
        console.log(`✅ Rappel envoyé et note urgente créée pour "${reminder.noteTitle}"`);
      } catch (error) {
        console.error(`❌ Erreur pour le rappel ${reminder.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Erreur lors de la vérification des rappels:", error);
  }
}

// Démarrer le cron job (vérifie toutes les minutes)
cron.schedule("* * * * *", checkAndSendReminders);
console.log("✅ Cron job démarré (vérification des rappels toutes les minutes)");

// Réinitialiser les habitudes quotidiennes à minuit
async function resetDailyHabitsJob() {
  try {
    const { resetDailyHabits } = await import("./lib/habits.js");
    await resetDailyHabits();
    console.log("✅ Habitudes quotidiennes réinitialisées");
  } catch (error) {
    console.error("Erreur lors de la réinitialisation des habitudes:", error);
  }
}

// Réinitialiser les habitudes quotidiennes à minuit (0 0 * * * = tous les jours à 00:00)
cron.schedule("0 0 * * *", resetDailyHabitsJob);
console.log("✅ Cron job pour les habitudes quotidiennes démarré (réinitialisation à minuit)");

// Réinitialiser aussi au démarrage si nécessaire
resetDailyHabitsJob();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  }).listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

