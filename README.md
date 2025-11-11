# MindLyst

MindLyst est une application de prise de notes collaborative et accessible depuis n'importe quel appareil. Les utilisateurs créent un compte, se connectent, puis gèrent leurs notes depuis un tableau de bord sécurisé.

## Démarrage

1. Installer les dépendances :
```bash
npm install
```

2. Configurer l'envoi d'emails (optionnel mais nécessaire pour les rappels) :
   - Copiez `.env.example` en `.env.local`
   - Remplissez les variables SMTP (pour Gmail, utilisez un "App Password")

3. Lancer le serveur :
```bash
npm run dev
```

Ou pour avoir les rappels automatiques (recommandé) :
```bash
node server.js
```

4. Ouvrir [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## Configuration des rappels par email

Pour activer l'envoi d'emails de rappels, configurez les variables d'environnement dans `.env.local` :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-app-password
SMTP_FROM=noreply@mindlyst.com
```

**Pour Gmail :**
1. Activez la validation en 2 étapes
2. Générez un "App Password" dans les paramètres Google
3. Utilisez cet App Password comme `SMTP_PASSWORD`

Les rappels sont vérifiés automatiquement toutes les minutes. Vous pouvez aussi appeler manuellement `/api/reminders/check`.

## Fonctionnalités

- Création de compte (`/signup`) avec hachage de mot de passe côté serveur.
- Connexion (`/login`) et gestion de session via cookie HttpOnly.
- Tableau de bord protégé (`/dashboard`) avec :
  - Ajout, modification, filtrage et suppression de notes
  - Notes avec titre et contenu pliables/dépliables
  - **Système de rappels par email** : programmez des rappels pour vos notes
- Persistance des données dans des fichiers JSON (`data/users.json`, `data/notes.json`, `data/sessions.json`, `data/reminders.json`).

## Routes API

- `POST /api/auth/signup` : enregistre un nouvel utilisateur.
- `POST /api/auth/login` : authentifie un utilisateur et crée la session.
- `POST /api/auth/logout` : met fin à la session.
- `GET /api/notes` : récupère les notes de l'utilisateur connecté.
- `POST /api/notes` : ajoute une note.
- `PUT /api/notes/[id]` : modifie une note.
- `DELETE /api/notes/[id]` : supprime une note.
- `GET /api/reminders` : récupère les rappels de l'utilisateur.
- `POST /api/reminders` : crée un rappel pour une note.
- `DELETE /api/reminders` : supprime un rappel.
- `POST /api/reminders/check` : vérifie et envoie les rappels en attente (appelé automatiquement).

## Stack

- Next.js 14 (App router désactivé au profit du dossier `pages/`)
- TypeScript
- Tailwind CSS

## Structure succincte

```
lib/
  auth.ts      // Hachage, sessions, helpers cookies
  db.ts        // Lecture/écriture JSON
pages/
  index.tsx    // Accueil
  signup.tsx
  login.tsx
  dashboard.tsx
  api/
    auth/
      signup.ts
      login.ts
      logout.ts
    notes/
      index.ts
      [id].ts
data/
  users.json
  notes.json
  sessions.json
```

Vous pouvez modifier librement les styles Tailwind dans `styles/globals.css`.
# Memory App

Application web pour résumer et classer vos notes automatiquement.

## Installation

1. Installer les dépendances :
```bash
npm install
```

2. Initialiser la base de données Prisma :
```bash
npx prisma generate
npx prisma db push
```

3. Lancer le serveur de développement :
```bash
npm run dev
```

4. Ouvrir [http://localhost:3000](http://localhost:3000)

## Fonctionnalités

- **Page d'accueil** (`/`) : Point d'entrée avec lien vers l'application
- **Page principale** (`/app`) : 
  - Formulaire pour coller un texte
  - Traitement automatique (résumé, catégorie, date)
  - Liste des notes sauvegardées
  - Filtrage par catégorie
- **API** :
  - `/api/process` : Traite un texte et retourne résumé, catégorie et date
  - `/api/notes` : Gère les notes (GET, POST, DELETE)

## Base de données

Les notes sont sauvegardées dans une base SQLite via Prisma. Le fichier de base de données se trouve dans `prisma/dev.db`.

Pour visualiser les données :
```bash
npx prisma studio
```

