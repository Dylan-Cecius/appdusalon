# Journal autonome AppDuSalon V2

## 2026-10-15 — préparation du fonctionnement autonome
- Demande de Dylan : reprendre les paramètres de Nous Deux pour cette conversation et AppDuSalon V2, avec contrôle et reprise horaire, jour et nuit.
- Configuration Nous Deux relue dans l'outil des tâches : sessions successives visant 50 minutes de développement et jusqu'à 10 minutes de vérifications/sauvegarde, dans les limites du service ; bilan quotidien ; interdiction de toute dépense.
- Accès GitHub et Sites vérifiés par lectures réussies. Branche actuelle : 9e4465a333fafa6a1c17f7c74f17606e3b3bff9a. Site actif et accès propriétaire uniquement.
- Consignes, backlog, journal et état coopératif préparés dans GitHub. Le dossier temporaire n'est pas une dépendance.
- Aucun changement applicatif, déploiement, backend réel ou message à un tiers. Commit documentaire avec [skip ci] pour ne pas déclencher des runners dont le coût disponible n'a pas été vérifié.
- Dernières preuves applicatives : CI 38561490094 réussie ; 99 unitaires, 99 navigateur et 6 sécurité. Aucun nouveau test applicatif nécessaire pour cette préparation documentaire.
- Activation des tâches à confirmer après retour de l'outil Automations ; ce texte ne prétend pas qu'un développeur est actif en permanence.

## 2026-10-15 — activation confirmée
- Outil Automations : développement activé (id 6ad0bea074788191a2d3c6552cbaea3e), cadence horaire sans restriction de jour, départ programmé le 15 octobre à 13:00, fuseau Etc/GMT-1.
- Bilan quotidien activé (id 6ad0beb1a5248191b071436ccba6117a), à partir du 16 octobre vers 08:00, même fuseau.
- Les deux tâches sont rattachées à la conversation 6ace21db-8a04-83ed-b903-a8c8b271d5f7.
- Le cycle horaire assure le contrôle de reprise et le développement ; aucun agent chef supplémentaire ne crée d'écritures concurrentes.
- À l'activation, aucun cycle de développement n'a encore été observé. La durée de travail visée ne constitue pas une garantie de durée d'exécution.
- Le journal conserve les progrès ordinaires ; notifications intermédiaires uniquement pour un nouveau blocage nécessitant Dylan ou un incident.

## 2026-10-15 — correction du fuseau demandée par Dylan
- Dylan précise qu’il est 13:56 chez lui au moment où le contexte technique indique 12:56. Les deux tâches ont été corrigées vers Europe/Brussels (heure belge, avec changements saisonniers).
- Développement : premier cycle programmé le 15 octobre à 14:00, puis chaque heure. L’instant du premier cycle reste le même que 13:00 dans l’ancien fuseau fixe UTC+1 ; son affichage local est corrigé.
- Bilan : chaque jour vers 08:00 heure belge, à partir du 16 octobre. Les prompts, autorisations et limites restent inchangés.
- Mises à jour confirmées par l’outil Automations. Aucune exécution de développement n’est encore constatée dans ces retours.

## 2026-10-15T12:07:12Z — checkpoint 1 : confirmation des actions de fiche
- Session salon-v2-2026-10-15T11-59-28-462Z. Durée observée depuis prise du bail : 7.7 min.
- Défaut établi par lecture : les callbacks annuler/absent lançaient une promesse ignorée et fermaient immédiatement la fiche ; encaisser fermait aussi avant confirmation dans le modal.
- Modifications : callbacks attendus jusqu’au résultat, verrou synchrone commun, boutons/champs bloqués pendant la requête, fermeture clavier/extérieur différée, erreur affichée sans perdre les saisies. Brouillon à sauvegarder avant action de statut.
- Checkpoint applicatif : commit « fix(agenda): await appointment actions and retain failed forms [skip ci] », parent ce33499bd7fc8c86579aee212395eacab7fa070a ; SHA exact à reporter au prochain checkpoint.
- Commandes observées : git clone --single-branch --branch v2/chatgpt-rebuild ; npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund (521 paquets, succès) ; npm run typecheck (succès) ; npm test (101/101, 14 fichiers) ; VITE_PREVIEW_STANDALONE=true VITE_PREVIEW_DEMO_ONLY=true npm run build (succès, 4.02 s) ; git diff --check (succès). Diff relu et revue React : promesses propagées, verrou en ref, état d’erreur accessible.
- Tests ajoutés : 2 unitaires de concurrence/échec/reprise exécutés ; 6 scénarios Playwright sur fiche réelle avec mutations fictives différées, préparés mais NON exécutés. Ces unitaires ne remplacent pas la recette navigateur.
- Limites : environnement Sites géré sans control-browser ; pas de serveur de preview ni contournement navigateur. CI distante et publication différées faute de preuve actuelle de coût nul. Aucun appel à un backend réel, aucune donnée réelle, aucun workflow lancé, aperçu précédent conservé.
- Prochaine tâche : règles d’action et montants affichés pour rendez-vous annulés/absents/terminés. Bail renouvelé.
