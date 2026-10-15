# Agent AppDuSalon V2 iOS / App Store

Mandat de Dylan du 15 octobre 2026 : créer un troisième agent, avec les mêmes paramètres que les agents Nous Deux et AppDuSalon V2 web, dédié à une application iOS App Store. Reprendre la base existante si utile. Aucune dépense.

## Périmètre
- Dépôt Dylan-Cecius/appdusalon, branche autorisée **v2/ios-appstore** uniquement.
- Cette branche est issue du checkpoint web 8a6933c853544e6629bad6d0d62e1097213adaf8. Le mandat iOS remplace ici le périmètre web du fichier AUTONOMY.md hérité ; il ne modifie pas les consignes de la branche web.
- Lire AUTONOMY.md, AUTONOMY-BACKLOG.md, AUTONOMY-STATE.json, AUTONOMY-LOG.md, docs/mobile/IOS_HANDOFF.md et docs/mobile/IOS_RELEASE_STATUS.md avant toute action.
- Ne pas écrire sur main, v2/chatgpt-rebuild, Nous Deux, ni sur le projet Sites de la V2 web. Conserver les fonctions métier V2, l'agenda pratique et les couleurs pastel.
- Réutiliser React/Vite/Capacitor et les fonctions métier existantes. Ne lancer une réécriture complète que si un défaut d'architecture concret la justifie, avec décision documentée.
- Livrable : application iPhone, adaptation iPad ensuite, source reproductible, parcours mobiles testés, préparation TestFlight et dossier App Store. Une configuration Capacitor seule ne constitue pas une application iOS compilée.
- L'identifiant app.lovable.bc4f1f063375468ea2e9bd0862a8c643 est hérité et non vérifié auprès d'Apple. Ne pas inventer un identifiant enregistré, un compte, une signature, une validation ou des essais iPhone.

## Cycles et sauvegarde
- Cadence horaire jour et nuit, tous les jours, avec bilan quotidien vers 08:00 dans le fuseau de la tâche.
- Préparer plusieurs tâches bornées, viser environ 50 minutes de travail utile et jusqu'à 10 minutes de contrôles/sauvegarde dans les limites réelles du service.
- Diagnostiquer, implémenter, contrôler, examiner le diff et enregistrer un checkpoint par tâche ; enchaîner si du travail utile et du budget restent disponibles.
- Ne jamais attendre pour remplir une durée, répéter des tests inutiles, inventer des modifications ou prétendre travailler entre les cycles. Consigner durée observée et cause d'une fin anticipée.
- Travailler via le cloud et GitHub, sans dépendre du PC de Dylan ni d'un dossier temporaire conservé.
- Si nécessaire récupérer les arbres/blobs autorisés ; vérifier les SHA. Une copie sans assets binaires ne permet pas une validation visuelle ou native complète.

## Concurrence et coordination
- Un seul développeur actif sur v2/ios-appstore. AUTONOMY-STATE.json porte le bail coopératif.
- Revendiquer le bail par mise à jour Git avec expected_sha, identifiant unique, début, checkpoint et expiration au plus 75 minutes après le checkpoint.
- Si un autre bail non expiré existe, ne pas lancer de second développeur. Après expiration, relire code/journal avant reprise.
- Vérifier la propriété du bail avant chaque écriture, le renouveler aux checkpoints puis le libérer. Ne jamais forcer une référence ni écraser une session concurrente.
- Lire les évolutions v2/chatgpt-rebuild et intégrer sélectivement les corrections utiles dans la branche iOS, avec tests ; ne pas remplacer les consignes/état iOS par les fichiers de l'agent web. Ne pas fusionner vers les branches web/main.
- Aucun agent chef, boucle supplémentaire ou automatisation en cascade.

## Interdiction de dépense
- Aucun paiement, transfert, dépôt d'argent, achat, abonnement, crédits, domaine, moyen de paiement ou augmentation de budget.
- Aucun build distant EAS/Xcode Cloud, runner, déploiement, API à l'usage, SMS ou e-mail facturable sans preuve actuelle d'absence de coût supplémentaire.
- Coût inconnu : bloquer seulement cette opération et poursuivre un travail gratuit. Ne jamais acheter de quota.
- Inclure [skip ci] dans les commits tant que le coût des services déclenchés n'est pas établi. Ne pas lancer workflow_dispatch ni utiliser des marqueurs de déploiement. Ne pas modifier les workflows pour contourner un contrôle.
- Un contrôle différé reste manquant ; ne jamais présenter le code comme validé si une vérification nécessaire n'a pas eu lieu.

## Données et publication
- Développement local/cloud isolé avec données synthétiques. Ne pas utiliser le .env suivi pour accéder au backend réel. Employer explicitement les modes démo ou des fixtures, puis un backend jetable quand nécessaire.
- Aucune donnée réelle du salon, opération Stripe réelle, migration hébergée, modification DNS/secrets, suppression réelle, invitation, SMS, e-mail ou message à un tiers.
- Préparer les éléments TestFlight/App Store ; ne pas publier, soumettre ou diffuser sur les stores, accepter un contrat Apple, ni modifier des réglages de compte sans autorisation spécifique ultérieure. Respecter aussi l'interdiction de coût.
- Ne pas modifier la version de Nous Deux déjà sur TestFlight.
- Vérifier les documents Apple/Capacitor actuels lors des choix de version, de signature, de confidentialité et de facturation. Ne pas confondre une recommandation technique avec une acceptation Apple.

## Validation et compte rendu
- Contrôles selon le périmètre : npm run typecheck, npm test, npm run build, modes démo explicites, parcours navigateur autorisés, puis compilation/simulateur iOS seulement si l'environnement compatible est disponible et sans coût.
- Préserver les validations web : une compilation JS ne prouve ni un démarrage iOS, ni une session/reconnexion native, ni un achat, ni des notifications.
- AUTONOMY-LOG.md : heure UTC, durée observée, tâche, fichiers/commit, commandes réellement exécutées, résultats, limites et priorité suivante.
- Distinguer : source préparée, tests exécutés, projet iOS généré, build signée, TestFlight distribué et validation Apple.
- Progrès ordinaires dans le journal et bilan quotidien français ; notification immédiate seulement pour un nouveau blocage nécessitant Dylan ou un incident réel. Aucun pourcentage global inventé.


## Pause demandée par Dylan — 2026-10-15T16:34:27Z

Développement interrompu à la demande explicite « stop les agents IA pour le moment ». Développement et bilans automatiques des trois projets en pause ; aucune reprise sans nouvelle demande de Dylan. Bail iOS libéré. Durée observée de cette session jusqu’au contrôle de pause : 1199 secondes (19 min 59 s), incluant les contrôles et la sauvegarde, sans activité continue revendiquée.

Dernier checkpoint source vérifié : `27a1a552918b942be1e9e9137820c8691a5bb020`. Six checkpoints indépendants enregistrés pendant cette session. Suite complète observée au checkpoint 5 : 339 tests / 38 fichiers passants ; checkpoint 6 : 18 tests ciblés, TypeScript et compilation source isolée (3621 modules) passants. 44 cas navigateur découverts, aucun exécuté. Projet Capacitor généré/synchronisé ; aucune compilation iOS, signature, distribution TestFlight ou validation Apple.

Le travail commencé ensuite sur les doubles appuis du panneau d’indisponibilités est conservé uniquement comme brouillon dans `docs/mobile/drafts/2026-10-15-time-off-panel.patch`, non appliqué aux sources GitHub. La commande de vérification a été interrompue (code 130) : aucun résultat de succès attribué à ce brouillon. Ne pas le considérer comme validé ni le publier. Après autorisation explicite de reprise : relire les sources et ce diff, puis décider de sa reprise et exécuter les contrôles nécessaires.
