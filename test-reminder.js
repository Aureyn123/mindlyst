// Script de test pour vérifier l'envoi d'emails
// Utilisation: node test-reminder.js

require("dotenv").config({ path: ".env.local" });

async function testEmail() {
  try {
    // Charger dynamiquement les fonctions
    const { sendReminderEmail } = await import("./lib/email.js");
    
    const testEmail = process.env.SMTP_USER || "test@example.com";
    
    console.log("🧪 Test d'envoi d'email...");
    console.log("📧 Destinataire:", testEmail);
    console.log("📧 Expéditeur:", process.env.SMTP_USER || "non configuré");
    
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      console.error("❌ Configuration SMTP manquante !");
      console.log("\nCréez un fichier .env.local avec :");
      console.log("SMTP_HOST=smtp.gmail.com");
      console.log("SMTP_PORT=587");
      console.log("SMTP_USER=votre-email@gmail.com");
      console.log("SMTP_PASSWORD=votre-app-password");
      process.exit(1);
    }
    
    await sendReminderEmail(
      testEmail,
      "Test de rappel",
      "Ceci est un email de test pour vérifier que la configuration SMTP fonctionne.",
      new Date()
    );
    
    console.log("✅ Email de test envoyé avec succès !");
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi:", error.message);
    if (error.code === "EAUTH") {
      console.error("\n💡 Erreur d'authentification. Vérifiez :");
      console.error("   - Que vous utilisez un App Password pour Gmail");
      console.error("   - Que la validation en 2 étapes est activée");
    }
    process.exit(1);
  }
}

testEmail();

