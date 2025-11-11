# Configuration des rappels par email

## Problème : Les emails ne sont pas envoyés

Pour que les rappels fonctionnent, il faut :

### 1. Installer les dépendances
```bash
npm install
```

### 2. Configurer l'envoi d'emails

Créez un fichier `.env.local` à la racine du projet avec :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=votre-email@gmail.com
SMTP_PASSWORD=votre-app-password
SMTP_FROM=noreply@mindlyst.com
```

**Pour Gmail :**
1. Allez sur https://myaccount.google.com/security
2. Activez la validation en 2 étapes
3. Générez un "App Password" : https://myaccount.google.com/apppasswords
4. Utilisez cet App Password comme `SMTP_PASSWORD`

**Pour iCloud :**
```env
SMTP_HOST=smtp.mail.me.com
SMTP_PORT=587
SMTP_USER=votre-email@icloud.com
SMTP_PASSWORD=votre-mot-de-passe-app
```

### 3. Démarrer le serveur avec cron

**Option 1 : Utiliser le serveur avec cron intégré (recommandé)**
```bash
node server.js
```

**Option 2 : Utiliser npm run dev + vérification manuelle**
```bash
npm run dev
# Puis dans un autre terminal, appelez périodiquement :
curl -X POST http://localhost:3000/api/reminders/check
```

### 4. Tester l'envoi d'email

Une fois configuré, vous pouvez tester en appelant directement l'API :
```bash
curl -X POST http://localhost:3000/api/reminders/check
```

Ou en ouvrant dans le navigateur :
```
http://localhost:3000/api/reminders/check
```

### 5. Vérifier les logs

Le serveur affichera dans la console :
- `📋 X rappel(s) à envoyer` quand des rappels sont trouvés
- `✅ Rappel envoyé à ...` quand un email est envoyé avec succès
- `❌ Erreur pour le rappel ...` en cas d'erreur
- `⚠️ SMTP non configuré` si les variables d'environnement ne sont pas définies

### Dépannage

**Si vous voyez "SMTP non configuré" :**
- Vérifiez que `.env.local` existe et contient les bonnes variables
- Redémarrez le serveur après avoir créé/modifié `.env.local`

**Si vous voyez des erreurs d'authentification :**
- Pour Gmail : utilisez un App Password, pas votre mot de passe normal
- Vérifiez que la validation en 2 étapes est activée

**Si le cron ne fonctionne pas :**
- Utilisez `node server.js` au lieu de `npm run dev`
- Ou appelez manuellement `/api/reminders/check` toutes les minutes

