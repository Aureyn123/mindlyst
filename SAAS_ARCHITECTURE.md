# Architecture SaaS pour MindLyst

## 📧 Envoi d'emails - Simple et scalable

**Bonne nouvelle :** L'envoi d'emails est déjà en place ! Pour un SaaS, il suffit d'utiliser un service professionnel.

### Options recommandées (du plus simple au plus avancé) :

#### 1. **Resend** (⭐ Recommandé pour commencer)
- ✅ **Gratuit** : 3000 emails/mois
- ✅ **Simple** : API REST, pas de configuration SMTP
- ✅ **Excellent pour SaaS** : tracking, analytics, templates
- ✅ **Setup en 5 minutes**

```env
EMAIL_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxxxxxx
EMAIL_FROM=MindLyst <noreply@mindlyst.com>
```

#### 2. **SendGrid**
- ✅ **Gratuit** : 100 emails/jour
- ✅ **Très fiable** : utilisé par de nombreux SaaS
- ✅ **Analytics avancés**

```env
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
EMAIL_FROM=noreply@mindlyst.com
```

#### 3. **SMTP classique** (déjà en place)
- ✅ Fonctionne mais moins scalable
- ⚠️ Limites d'envoi selon le provider
- ⚠️ Pas d'analytics intégrés

## 💳 Système d'abonnement

### Plans proposés

| Plan | Prix | Notes | Rappels/mois | Fonctionnalités |
|------|------|-------|--------------|-----------------|
| **Free** | Gratuit | 50 | 10 | Notes, catégories, filtres |
| **Pro** | €9.99/mois | 1000 | 500 | + Rappels, export |
| **Enterprise** | €29.99/mois | Illimité | Illimité | + API, support prioritaire |

### Intégration Stripe (recommandé)

1. **Créer un compte Stripe** : https://stripe.com
2. **Installer le SDK** :
```bash
npm install stripe @stripe/stripe-js
```

3. **Créer les produits et prix** dans le dashboard Stripe
4. **Intégrer le checkout** dans l'app

### Fichiers à créer :

- `pages/api/subscription/create-checkout.ts` - Créer une session Stripe
- `pages/api/subscription/webhook.ts` - Gérer les événements Stripe (paiement, annulation)
- `pages/pricing.tsx` - Page de tarification
- `pages/api/subscription/status.ts` - Vérifier le statut d'abonnement

## 🔒 Limites par plan

Le système vérifie automatiquement :
- ✅ Nombre de notes (limite selon le plan)
- ✅ Nombre de rappels par mois
- ✅ Accès aux fonctionnalités premium

## 📊 Structure des données

### Nouveaux fichiers JSON :
- `data/subscriptions.json` - Abonnements utilisateurs
- `data/usage.json` - Statistiques d'utilisation (optionnel)

### Modifications utilisateur :
```typescript
type UserRecord = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
  subscriptionPlan?: "free" | "pro" | "enterprise"; // Ajout
  stripeCustomerId?: string; // Ajout
};
```

## 🚀 Étapes pour transformer en SaaS

### Phase 1 : Email professionnel (1h)
1. Créer un compte Resend
2. Ajouter la clé API dans `.env.local`
3. Tester l'envoi

### Phase 2 : Système d'abonnement (2-3h)
1. Créer un compte Stripe
2. Créer les produits/prix
3. Intégrer le checkout
4. Créer la page pricing
5. Ajouter les webhooks Stripe

### Phase 3 : Limites et restrictions (1h)
1. Vérifier les limites lors de la création de notes
2. Vérifier les limites lors de la création de rappels
3. Afficher les messages d'upgrade

### Phase 4 : Dashboard utilisateur (2h)
1. Page `/settings` avec gestion d'abonnement
2. Affichage de l'utilisation (notes/rappels)
3. Bouton d'upgrade/downgrade

## 💡 Avantages d'un service d'email professionnel

### Resend vs SMTP classique :

| Feature | Resend | SMTP (Gmail/iCloud) |
|---------|--------|---------------------|
| **Limite** | 3000/mois gratuit | ~500/jour (Gmail) |
| **Délivrabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Analytics** | ✅ Oui | ❌ Non |
| **Templates** | ✅ Oui | ❌ Non |
| **Setup** | 5 min | 30 min |
| **Scalabilité** | ⭐⭐⭐⭐⭐ | ⭐⭐ |

## 📝 Checklist SaaS

- [x] Système d'email fonctionnel
- [x] Structure d'abonnement créée
- [ ] Intégration Stripe
- [ ] Page de tarification
- [ ] Vérification des limites
- [ ] Dashboard utilisateur
- [ ] Webhooks Stripe
- [ ] Analytics d'utilisation

## 🎯 Conclusion

**L'envoi d'emails est déjà simple** - il suffit de passer à Resend (5 minutes de config) pour avoir un système professionnel et scalable.

Le système d'abonnement est prêt à être intégré avec Stripe. Il ne reste qu'à :
1. Créer les produits dans Stripe
2. Ajouter le checkout
3. Gérer les webhooks

**Temps estimé total : 4-6h pour un SaaS fonctionnel** 🚀

