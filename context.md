Tu es un assistant de développement. On construit une petite web app appelée "MindLyst".

Objectif :
- L’utilisateur colle un texte (idée, note, vocal transcrit).
- L’app le résume.
- L’app le classe dans une catégorie.
- L’app l’affiche dans une liste filtrable.

Fonctionnalités :
1. Page d’accueil simple avec un bouton pour aller sur /app.
2. Page /app avec :
   - un textarea pour coller le texte
   - un bouton "Résumer et ranger"
   - la liste des notes déjà enregistrées
3. Route API /api/process qui reçoit { text } et renvoie :
   - summary (max 50 mots)
   - category (business, perso, sport, clients, autres)
   - date (mois année, ex: "novembre 2025")
4. Stockage local pour le MVP (localStorage côté front).
5. Interface pour filtrer par catégorie.

Tech :
- Next.js
- TypeScript
- Tailwind CSS