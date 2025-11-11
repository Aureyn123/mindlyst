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

