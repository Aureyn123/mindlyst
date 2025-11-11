// Version SaaS avec support de plusieurs providers d'email
// Supporte : Resend (recommandé), SendGrid, ou SMTP classique

import nodemailer from "nodemailer";

type EmailProvider = "resend" | "sendgrid" | "smtp";

// Configuration Resend (recommandé pour SaaS - gratuit jusqu'à 3000 emails/mois)
async function sendWithResend(to: string, subject: string, html: string, text: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY non configuré");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "MindLyst <noreply@mindlyst.com>",
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend error: ${error.message || "Unknown error"}`);
  }

  return await response.json();
}

// Configuration SendGrid
async function sendWithSendGrid(to: string, subject: string, html: string, text: string) {
  const sendgridApiKey = process.env.SENDGRID_API_KEY;
  if (!sendgridApiKey) {
    throw new Error("SENDGRID_API_KEY non configuré");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: process.env.EMAIL_FROM || "noreply@mindlyst.com" },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`SendGrid error: ${error}`);
  }
}

// Configuration SMTP classique (fallback)
async function sendWithSMTP(to: string, subject: string, html: string, text: string) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASSWORD || "",
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@mindlyst.com",
    to,
    subject,
    html,
    text,
  });
}

export async function sendReminderEmail(
  to: string,
  noteTitle: string,
  noteText: string,
  reminderDate: Date
): Promise<void> {
  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(reminderDate);

  const subject = `🔔 Rappel MindLyst : ${noteTitle}`;
  const html = `
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
  `;
  const text = `
Rappel MindLyst

Bonjour,

Vous avez demandé un rappel pour cette note :

Titre: ${noteTitle}

Contenu:
${noteText}

Rappel programmé pour : ${formattedDate}

---
Ceci est un email automatique de MindLyst.
  `;

  const provider = (process.env.EMAIL_PROVIDER || "resend") as EmailProvider;

  try {
    switch (provider) {
      case "resend":
        await sendWithResend(to, subject, html, text);
        break;
      case "sendgrid":
        await sendWithSendGrid(to, subject, html, text);
        break;
      case "smtp":
        await sendWithSMTP(to, subject, html, text);
        break;
      default:
        throw new Error(`Provider inconnu: ${provider}`);
    }
    console.log(`✅ Email de rappel envoyé à ${to} via ${provider}`);
  } catch (error) {
    console.error(`❌ Erreur lors de l'envoi de l'email (${provider}):`, error);
    throw error;
  }
}

