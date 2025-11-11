# Configuration des Intégrations

Ce guide explique comment configurer les intégrations avec Google Calendar, Apple Calendar et Notion.

## Google Calendar

### 1. Créer un projet Google Cloud

1. Va sur [Google Cloud Console](https://console.cloud.google.com/)
2. Crée un nouveau projet ou sélectionne un projet existant
3. Active l'API Google Calendar :
   - Va dans "APIs & Services" > "Library"
   - Recherche "Google Calendar API"
   - Clique sur "Enable"

### 2. Configurer OAuth 2.0

1. Va dans "APIs & Services" > "Credentials"
2. Clique sur "Create Credentials" > "OAuth client ID"
3. Si c'est la première fois, configure l'écran de consentement OAuth :
   - Type d'application : "External"
   - Remplis les informations requises
   - Ajoute ton email comme test user
4. Crée les identifiants OAuth :
   - Type d'application : "Web application"
   - Nom : "MindLyst Calendar Integration"
   - URI de redirection autorisés : 
     - `http://localhost:3000/api/integrations/google-calendar/callback` (développement)
     - `https://ton-domaine.com/api/integrations/google-calendar/callback` (production)
5. Copie le **Client ID** et le **Client Secret**

### 3. Configurer les variables d'environnement

Ajoute dans ton fichier `.env.local` :

```env
GOOGLE_CLIENT_ID=ton_client_id_ici
GOOGLE_CLIENT_SECRET=ton_client_secret_ici
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google-calendar/callback
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Pour la production, remplace `localhost:3000` par ton domaine.

### 4. Utilisation

1. Va sur le dashboard
2. Clique sur "Gérer" dans la section Intégrations
3. Clique sur "Connecter" pour Google Calendar
4. Autorise l'accès à ton calendrier Google
5. Tu seras redirigé vers le dashboard avec une confirmation

### 5. Fonctionnement automatique

Quand tu crées une note avec une date détectée (ex: "rendez-vous client le 15 janvier 2024 à 14h"), l'événement est automatiquement ajouté à ton Google Calendar !

**Formats de dates supportés :**
- "le 15 janvier 2024 à 14h30"
- "15/01/2024 14:30"
- "2024-01-15 14:30"
- "demain à 14h"
- "dans 3 jours à 10h"

## Apple Calendar

L'intégration avec Apple Calendar sera disponible prochainement. Elle utilisera le protocole CalDAV pour synchroniser les événements.

## Notion

L'intégration avec Notion sera disponible prochainement. Elle permettra de synchroniser tes notes avec une base de données Notion.

## Dépannage

### Erreur "Google Calendar not configured"
- Vérifie que les variables `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont bien définies dans `.env.local`
- Redémarre le serveur après avoir ajouté les variables

### Erreur "redirect_uri_mismatch"
- Vérifie que l'URI de redirection dans Google Cloud Console correspond exactement à `GOOGLE_REDIRECT_URI`
- Les URLs doivent correspondre exactement (pas de slash final, http vs https, etc.)

### Les événements ne sont pas créés
- Vérifie que Google Calendar est bien connecté dans les intégrations
- Vérifie que la note contient une date dans un format supporté
- Regarde les logs du serveur pour voir les erreurs éventuelles

