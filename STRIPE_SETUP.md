# Configuration Stripe pour MindLyst

## 🚀 Étapes de configuration

### 1. Créer un compte Stripe

1. Allez sur https://stripe.com
2. Créez un compte (gratuit)
3. Activez le mode test pour commencer

### 2. Créer le produit et le prix

1. Dans le dashboard Stripe, allez dans **Produits**
2. Cliquez sur **"Ajouter un produit"**
3. Remplissez :
   - **Nom** : MindLyst Pro
   - **Description** : Abonnement Pro - 10 notes par jour
   - **Prix** : 9.00 €
   - **Facturation** : Récurrente (mensuelle)
4. Cliquez sur **"Enregistrer le produit"**
5. **Copiez l'ID du prix** (commence par `price_...`) - vous en aurez besoin !

### 3. Configurer les variables d'environnement

Ajoutez dans votre fichier `.env.local` :

```env
# Clés API Stripe
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
STRIPE_PRICE_ID_PRO=price_xxxxxxxxxxxxx

# Secret du webhook (à configurer après)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

**Où trouver les clés :**
- `STRIPE_SECRET_KEY` : Dashboard Stripe → Développeurs → Clés API → Clé secrète
- `STRIPE_PUBLISHABLE_KEY` : Dashboard Stripe → Développeurs → Clés API → Clé publiable
- `STRIPE_PRICE_ID_PRO` : Dashboard Stripe → Produits → Votre produit → ID du prix
- `STRIPE_WEBHOOK_SECRET` : Voir étape 4

### 4. Configurer le webhook (pour la production)

Le webhook permet à Stripe de notifier votre app des événements (paiement, annulation, etc.)

#### En développement local :

Utilisez **Stripe CLI** pour tester les webhooks localement :

```bash
# Installer Stripe CLI
brew install stripe/stripe-cli/stripe

# Se connecter
stripe login

# Écouter les webhooks et les forwarder vers votre serveur local
stripe listen --forward-to localhost:3000/api/subscription/webhook
```

Cela affichera un `STRIPE_WEBHOOK_SECRET` (commence par `whsec_...`) - ajoutez-le dans `.env.local`

#### En production :

1. Dans le dashboard Stripe → **Développeurs** → **Webhooks**
2. Cliquez sur **"Ajouter un endpoint"**
3. URL : `https://votre-domaine.com/api/subscription/webhook`
4. Sélectionnez les événements :
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copiez le **Secret du webhook** et ajoutez-le dans vos variables d'environnement

### 5. Tester le paiement

1. Redémarrez votre serveur : `npm run dev`
2. Allez sur `/pricing`
3. Cliquez sur "Passer à Pro"
4. Utilisez une carte de test Stripe :
   - **Numéro** : `4242 4242 4242 4242`
   - **Date** : N'importe quelle date future
   - **CVC** : N'importe quel 3 chiffres
   - **Code postal** : N'importe quel code postal

### 6. Vérifier que ça fonctionne

Après le paiement test :
- Vous devriez être redirigé vers `/subscription/success`
- Votre abonnement devrait être activé dans `data/subscriptions.json`
- Vous devriez pouvoir créer 10 notes par jour au lieu de 2

## 📝 Checklist

- [ ] Compte Stripe créé
- [ ] Produit "MindLyst Pro" créé (9€/mois)
- [ ] ID du prix copié
- [ ] Variables d'environnement configurées
- [ ] Webhook configuré (local ou production)
- [ ] Test de paiement réussi
- [ ] Abonnement activé dans l'app

## 🔒 Sécurité

- ⚠️ **Ne commitez JAMAIS** vos clés Stripe dans Git
- ✅ Utilisez `.env.local` (déjà dans `.gitignore`)
- ✅ En production, utilisez les variables d'environnement de votre hébergeur
- ✅ Utilisez les clés de **test** en développement
- ✅ Utilisez les clés de **production** uniquement en production

## 🎯 Prochaines étapes

Une fois Stripe configuré :
1. Tester le flux complet (paiement → activation)
2. Tester l'annulation d'abonnement
3. Ajouter une page de gestion d'abonnement (`/settings`)
4. Ajouter la possibilité de mettre à jour la carte de paiement

## 💡 Mode test vs Production

- **Mode test** : Utilisez `sk_test_...` et `pk_test_...`
- **Mode production** : Utilisez `sk_live_...` et `pk_live_...`
- Les paiements en mode test ne sont pas réels
- Les webhooks de test et production sont différents

