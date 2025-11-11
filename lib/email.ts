import nodemailer from "nodemailer";

// Configuration de l'envoi d'emails
// Pour Gmail, utilisez un "App Password" au lieu du mot de passe normal
// Pour d'autres services, adaptez les paramètres SMTP

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true pour 465, false pour autres ports
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASSWORD || ""
  }
});

export async function sendReminderEmail(to: string, noteTitle: string, noteText: string, reminderDate: Date): Promise<void> {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(reminderDate);

  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@mindlyst.com",
    to,
    subject: `🔔 Rappel MindLyst : ${noteTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #1e293b; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background-color: #f8fafc; padding: 20px; border-radius: 0 0 8px 8px; }
            .note-title { font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #1e293b; }
            .note-text { background-color: white; padding: 15px; border-radius: 4px; margin: 15px 0; white-space: pre-wrap; }
            .reminder-date { color: #64748b; font-size: 14px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Rappel MindLyst</h1>
            </div>
            <div class="content">
              <p>Bonjour,</p>
              <p>Vous avez demandé un rappel pour cette note :</p>
              <div class="note-title">${noteTitle}</div>
              <div class="note-text">${noteText}</div>
              <div class="reminder-date">
                <strong>Rappel programmé pour :</strong> ${formattedDate}
              </div>
              <p style="margin-top: 20px; color: #64748b; font-size: 12px;">
                Ceci est un email automatique de MindLyst. Pour gérer vos rappels, connectez-vous à votre compte.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `
Rappel MindLyst

Bonjour,

Vous avez demandé un rappel pour cette note :

Titre: ${noteTitle}

Contenu:
${noteText}

Rappel programmé pour : ${formattedDate}

---
Ceci est un email automatique de MindLyst.
    `
  };

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.warn("⚠️  SMTP non configuré. Email non envoyé (mode développement).");
    console.log("Email qui aurait été envoyé :", mailOptions);
    return;
  }

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de rappel envoyé à ${to}`);
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    throw error;
  }
}

