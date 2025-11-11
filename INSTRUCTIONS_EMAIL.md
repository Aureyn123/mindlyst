# Instructions pour configurer l'envoi d'emails

## ✅ Fichier .env.local créé

Le fichier `.env.local` a été créé avec votre configuration iCloud. 

## 🔑 Étape importante : Ajouter votre mot de passe d'application

**Vous devez maintenant :**

1. **Ouvrir le fichier `.env.local`** dans votre éditeur
2. **Remplacer la ligne vide `SMTP_PASSWORD=`** par votre mot de passe d'application iCloud

### Comment obtenir un mot de passe d'application iCloud :

1. Allez sur https://appleid.apple.com
2. Connectez-vous avec votre Apple ID (lennydecourtieux@icloud.com)
3. Dans la section **"Sécurité"**, cherchez **"Mots de passe d'application"**
4. Cliquez sur **"Générer un mot de passe d'application"**
5. Donnez-lui un nom (ex: "MindLyst")
6. Copiez le mot de passe généré (il s'affichera une seule fois !)
7. Collez-le dans `.env.local` après `SMTP_PASSWORD=`

**Exemple :**
```env
SMTP_PASSWORD=abcd-efgh-ijkl-mnop
```

## 🧪 Tester la configuration

Une fois le mot de passe ajouté, testez avec :

```bash
node test-reminder.js
```

Vous devriez recevoir un email de test sur votre adresse iCloud.

## 🚀 Envoyer les rappels en attente

Une fois que ça fonctionne, vous pouvez :

**Option 1 : Démarrer le serveur avec cron automatique**
```bash
node server.js
```
Les rappels seront vérifiés et envoyés automatiquement toutes les minutes.

**Option 2 : Envoyer manuellement les rappels en attente**
```bash
# Si le serveur tourne avec npm run dev
curl -X POST http://localhost:3000/api/reminders/check
```

Ou ouvrez dans votre navigateur :
```
http://localhost:3000/api/reminders/check
```

## 📧 Votre rappel actuel

Vous avez un rappel programmé pour :
- **Date** : 11 novembre 2025 à 18h23
- **Note** : "test 1 2"
- **Email** : lennydecourtieux@icloud.com

Une fois la configuration terminée, cet email sera envoyé automatiquement !

