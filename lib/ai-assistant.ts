// Assistant IA pour résumer les notes
// Pour l'instant, utilise un résumé basique. Peut être remplacé par OpenAI, Claude, etc.

export async function summarizeNote(text: string, maxLength: number = 150): Promise<string> {
  // Si le texte est déjà court, pas besoin de résumer
  if (text.length <= maxLength) {
    return text;
  }

  // Résumé simple : prendre les premières phrases importantes
  const sentences = text.split(/[.!?]\s+/).filter(s => s.trim().length > 0);
  
  if (sentences.length === 0) {
    return text.substring(0, maxLength) + "...";
  }

  // Prendre les premières phrases jusqu'à atteindre maxLength
  let summary = "";
  for (const sentence of sentences) {
    if (summary.length + sentence.length + 3 <= maxLength) {
      summary += (summary ? ". " : "") + sentence;
    } else {
      break;
    }
  }

  // Si on n'a pas assez de contenu, prendre le début du texte
  if (summary.length < 50) {
    summary = text.substring(0, maxLength).trim();
    // Couper au dernier espace pour éviter de couper un mot
    const lastSpace = summary.lastIndexOf(" ");
    if (lastSpace > 0) {
      summary = summary.substring(0, lastSpace);
    }
    summary += "...";
  } else {
    summary += "...";
  }

  return summary;
}

// Résumé avec IA externe (OpenAI, etc.) - à implémenter si besoin
export async function summarizeWithAI(text: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    // Fallback sur le résumé simple
    return summarizeNote(text);
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui résume des notes de manière concise et claire en français.",
          },
          {
            role: "user",
            content: `Résume cette note en 2-3 phrases maximum :\n\n${text}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("Erreur API OpenAI");
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || summarizeNote(text);
  } catch (error) {
    console.error("Erreur lors du résumé avec IA:", error);
    // Fallback sur le résumé simple
    return summarizeNote(text);
  }
}

// Détecter si une note est "longue" (nécessite un résumé)
export function isLongNote(text: string, threshold: number = 200): boolean {
  return text.length > threshold;
}

