# L'App du Salon V2 — Checklist de déploiement

> Branche source : `v2/chatgpt-rebuild`.
> Ne pas appliquer cette checklist à la production tant que la validation finale V2 n'est pas approuvée.

## 1. Backend isolé avant recette

Créer/utiliser un projet Supabase distinct pour la recette V2.

Ne pas utiliser le projet Supabase de production pour les tests d'écriture.

Configurer côté frontend de recette :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_PREVIEW_DEMO_ONLY=true` pour la preview publique V2
- `VITE_DEMO_ACCOUNT_EMAIL` facultatif ; défaut `demo@appdusalon.com`, à aligner avec le secret Edge `DEMO_ACCOUNT_EMAIL` s'il est personnalisé

Pour le workflow GitHub Pages de la V2, configurer les secrets GitHub suivants :

- `V2_PREVIEW_SUPABASE_URL`
- `V2_PREVIEW_SUPABASE_PUBLISHABLE_KEY`

Le workflow refuse désormais de déployer si ces secrets sont absents ou si l'URL Supabase de preview correspond à l'URL par défaut suivie dans `.env`.

### Workflow backend de recette isolé

Le workflow manuel `.github/workflows/v2-staging-backend.yml` nécessite :

- `V2_STAGING_SUPABASE_ACCESS_TOKEN`
- `V2_STAGING_SUPABASE_PROJECT_REF`
- `V2_STAGING_DB_PASSWORD`
- la confirmation manuelle exacte `STAGING_ONLY`

Il refuse de s'exécuter si la référence du projet staging correspond au projet Supabase par défaut suivi dans `.env`. Il effectue d'abord un dry-run des migrations, applique ensuite les migrations en attente sans données de seed, déploie explicitement les Edge Functions vers le projet staging, puis vérifie l'historique des migrations.

## 2. Secrets Edge Functions

Configurer dans le projet Supabase cible, sans les committer :

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `RESEND_API_KEY`
- `REPORT_FROM_EMAIL` — expéditeur validé chez Resend
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`
- `CRON_SECRET`
- `SMS_CRON_SECRET`
- `DEMO_ACCOUNT_PASSWORD`
- `DEMO_ACCOUNT_EMAIL` — optionnel, défaut : demo@appdusalon.com
- `APP_URL` — origine principale exacte de l'application
- `ALLOWED_APP_ORIGINS` — origines supplémentaires séparées par des virgules (recette/preview autorisées uniquement)

## 3. Supabase Vault

Créer les secrets Vault suivants :

- `functions_base_url` — ex. `https://<project-ref>.supabase.co`
- `cron_secret` — même valeur que `CRON_SECRET`
- `sms_cron_secret` — même valeur que `SMS_CRON_SECRET`

Ne jamais mettre ces valeurs en clair dans une migration.

## 4. Migrations

Appliquer toutes les migrations de la branche dans l'ordre.

Points V2 critiques à confirmer après migration :

- `staff` est la source canonique de l'équipe.
- `staff.auth_user_id` existe.
- `salon_settings.salon_id` est rempli et unique par salon.
- `todo_items.staff_id` existe.
- `appointments.staff_id` et `transactions.staff_id` existent.
- Les fonctions `record_pos_transaction`, `delete_pos_transaction`, `settle_appointment` existent.
- Les fonctions de mot de passe Stats fonctionnent au niveau salon.
- Les triggers anti-conflit RDV et contrôle catalogue sont actifs.
- Les triggers d'abonnement inventaire / notes clients sont actifs.
- Supabase Vault, pg_cron et pg_net sont disponibles.
- Les jobs cron `process-scheduled-reports` et `process-sms-automations` existent.

## 5. Edge Functions

Déployer au minimum les fonctions V2 actives :

- `check-subscription`
- `create-checkout`
- `customer-portal`
- `create-employee`
- `revoke-employee-access`
- `demo-login`
- `seed-demo-data`
- `get-salon-booking-data`
- `get-booking-slots`
- `create-public-booking`
- `send-report-email`
- `send-automated-report`
- `process-scheduled-reports`
- `send-sms-campaign`
- `send-sms-automation`
- `send-sms-test`
- `check-appointment-reminders`
- `process-sms-automations`
- `create-promo-code`

Respecter les valeurs `verify_jwt` de `supabase/config.toml`.

## 6. Supabase Auth

Configurer :

- Site URL = URL officielle de l'application.
- Redirect URLs :
  - `<APP_URL>/auth`
  - `<APP_URL>/`
  - URL de recette `/auth` si elle est utilisée.
- Google OAuth : callback Supabase correct.
- Apple OAuth : callback Supabase correct.

Tester séparément :

1. inscription propriétaire ;
2. confirmation email ;
3. mot de passe oublié ;
4. invitation employé ;
5. définition du mot de passe invité ;
6. MFA si activé ;
7. déconnexion/reconnexion.

## 7. Stripe

Vérifier dans l'environnement cible :

- clé secrète correcte ;
- création Solo à 19 €/mois ;
- création Équipe à 59 €/mois ;
- metadata `plan=solo|equipe` ;
- prévention d'un deuxième abonnement actif ;
- portail client propriétaire uniquement ;
- un employé ne peut pas ouvrir Checkout/portail ;
- retour Stripe vers une origine autorisée uniquement.

## 8. Email / Resend

- Vérifier le domaine d'envoi.
- Régler `REPORT_FROM_EMAIL` avec une adresse validée.
- Tester un rapport manuel.
- Tester un rapport automatisé.
- Vérifier qu'un compte Solo ne peut pas utiliser les rapports Équipe.

## 9. SMS / Twilio

- Tester un SMS avec l'outil plateforme.
- Tester rappel RDV.
- Tester anniversaire.
- Tester réactivation.
- Tester une campagne Équipe.
- Vérifier `sms_opt_out`.
- Vérifier la déduplication.
- Vérifier que l'employé ne peut pas déclencher une campagne.

## 10. Recette fonctionnelle minimale

### Propriétaire Gratuit
- Caisse services.
- Clients basiques.
- 1 membre maximum.
- Pas de réservation publique.
- Pas de SMS.
- Pas de produits/stocks avancés.
- Pas de notes client complètes.
- Pas de rapports.

### Propriétaire Solo
- Réservation publique.
- SMS automatiques.
- Notes client.
- 1 membre maximum.
- Pas d'accès employé invité.
- Pas d'inventaire avancé.
- Pas de rapports Équipe.

### Propriétaire Équipe
- Jusqu'à 5 membres.
- Invitation/révocation des comptes employés.
- Produits/stocks.
- Statistiques avancées.
- Rapports.
- Marketing SMS ciblé.

### Employé
- Connexion par invitation.
- Droits hérités du salon.
- Pas de paramètres.
- Pas de facturation Stripe.
- Pas de campagnes SMS.
- Pas de rapports admin.
- Pas de modification/suppression historique encaissements.
- Perte d'accès si le salon n'a plus Équipe/Lifetime.

## 11. Recette données critiques

- Deux réservations simultanées ne peuvent pas occuper le même créneau.
- Encaissement POS décrémente le stock atomiquement.
- Annulation POS restaure le stock atomiquement et nécessite un admin.
- Les prix POS sont recalculés côté serveur.
- Encaisser un RDV crée une transaction POS et marque le RDV payé dans la même transaction.
- Les prix/durées de RDV proviennent du catalogue serveur.
- Le CA provient uniquement des transactions POS.
- L'effacement RGPD conserve la comptabilité mais retire/anonymise les données personnelles.

## 12. CI avant publication

La branche à publier doit avoir un run `V2 CI` entièrement vert :

- Typecheck
- Edge function typecheck
- Unit tests
- Build
- Browser smoke tests desktop
- Browser smoke tests mobile
- Lint

## 13. Publication

Après recette seulement :

1. sauvegarder/backup la base production ;
2. vérifier les secrets production ;
3. appliquer les migrations production ;
4. déployer les Edge Functions ;
5. vérifier les cron ;
6. publier le frontend ;
7. tester login, caisse, agenda, réservation publique, Stripe, mail et SMS ;
8. surveiller les logs ;
9. seulement ensuite fusionner/archiver la branche selon la stratégie choisie.
