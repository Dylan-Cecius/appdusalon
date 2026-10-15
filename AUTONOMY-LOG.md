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

## 2026-10-15T12:11:17Z — checkpoint 2 : statuts et montants cohérents
- Lot précédent confirmé : 174ab02dfb772877e091988eaddb34aa215ffc6e. Durée cumulée observée : 11.8 min depuis prise du bail.
- Défaut établi par lecture : encaissement et clôture prépayée n’excluaient ni annulation ni absence ; coordonnées modifiables sans bouton de sauvegarde sur historique ; le libellé « payé en ligne » était appliqué aussi aux règlements de caisse.
- Correction : politique getAppointmentDetails, badges partagés, contrôles de statut dans les handlers, historique en lecture seule, solde nul pour ancien dossier encaissé même sans amountPaid, libellé neutre du montant réglé et libellé historique après remboursement. Aucune logique backend/transaction financière modifiée.
- Commit de ce checkpoint : « fix(agenda): respect terminal appointment states in details [skip ci] » ; parent 174ab02dfb772877e091988eaddb34aa215ffc6e.
- Commandes : npm run typecheck (succès), npm test (113/113, dont 12 nouveaux tests de politique), VITE_PREVIEW_STANDALONE=true VITE_PREVIEW_DEMO_ONLY=true npm run build (succès), git diff --check (succès). Diff et règles financières existantes relus.
- Playwright --list : 20 cas découverts pour la fixture (10 scénarios sur 2 formats), sans lancer serveur ni navigateur. Ceci n’est PAS une exécution de recette. Quatre scénarios de statuts ajoutés au lot précédent.
- Limites inchangées : navigateur, CI distante et publication non réalisés ; ancien aperçu conservé. Prochain lot : coordonnées/sauvegarde concurrente. Bail renouvelé.

## 2026-10-15T12:15:34Z — checkpoint 3 : coordonnées et concurrence
- Lot 2 confirmé : b5867d1a19500518ce925c59e8e1f2561469f0e8. Durée cumulée : 16.1 min.
- Défauts établis : test de vérité sur clientPhone omettant une chaîne vide ; update sans select ni révision annonçant un succès pour zéro ligne ; toast de succès doublé entre hook et modal.
- Correction : patch de coordonnées explicite, nom normalisé, téléphone/notes effaçables, select de confirmation avec filtre salon/id/updated_at et statut actif. La révision vient de la fiche ouverte, pas d’un état rafraîchi qui pourrait masquer un conflit. Erreur visible avec conservation du brouillon. Démo : modification des seules coordonnées sans revalider à tort les horaires et étapes inchangés. Toast de succès unique.
- Commit : « fix(agenda): confirm contact writes and reject stale forms [skip ci] », parent b5867d1a19500518ce925c59e8e1f2561469f0e8.
- Commandes : npm run typecheck (succès), npm test (119/119, 16 fichiers), VITE_PREVIEW_STANDALONE=true VITE_PREVIEW_DEMO_ONLY=true npm run build (succès), git diff --check (succès). Test ciblé appointmentContactUpdate rejoué après ajout du cas de protection des champs financiers : 6/6. Aucun test SQL ni backend réel : aucune migration modifiée.
- Les 6 nouveaux tests utilisent uniquement un client de requête fictif : effacement, entrée invalide, filtres et retour serveur, zéro ligne, erreur serveur, prérequis absents. Ils ne constituent pas une validation RLS hébergée. Diff relu ; import type du client Supabase n’ajoute pas de connexion à la démo.
- Limites de recette navigateur/CI/coût/publication inchangées. Prochain lot : interprétation des réponses d’annulation et d’encaissement. Bail renouvelé.

## 2026-10-15T12:20:22Z — checkpoint 4 : réponse confirmée, pas statut supposé
- Lot 3 confirmé : 9b9ac86e1d50ec45f173f6f04cc829dd2674430c. Durée cumulée : 20.9 min.
- Défauts établis par lecture du hook et des contrats SQL/Edge : réponse already_closed ignorée au profit du statut demandé ; payload vide d’annulation/encaissement traité comme succès ; drapeaux paymentStatus/amountPaid non actualisés après RPC ; toast carte même pour prestation prépayée.
- Correction : parseurs purs des réponses, statut réel d’annulation et signal de remboursement échoué conservés, suppression de l’expiration locale après clôture, transaction retournée contrôlée (id, appointment_id, salon_id, montant). Montant confirmé dans l’état local ; toast prépayé distinct. Démo : contrôle de statut avec état courant atomique, aucun paiement réel. Aucun RPC ni migration modifié.
- Commit : « fix(agenda): reconcile confirmed cancellation and settlement results [skip ci] », parent 9b9ac86e1d50ec45f173f6f04cc829dd2674430c.
- Commandes : premier npm run typecheck a relevé un élargissement TypeScript du statut, corrigé ; second npm run typecheck réussi ; npm test 126/126 (17 fichiers, 7 nouveaux tests de contrats) ; npm run build réussi en 7.71 s ; git diff --check réussi. Diff relu. Les tests n’appellent pas Supabase/Stripe ni un autre fournisseur.
- Limites : recette navigateur et fournisseurs hébergés non exécutés, contrôle du build standalone final prévu après le lot suivant, pas de publication.
- Prochaine tâche concrète repérée : userIdRef empêche le rechargement quand le salon change pour le même utilisateur ; les requêtes concurrentes peuvent rétablir une liste plus ancienne. Bail renouvelé.

## 2026-10-15T12:31:39Z — checkpoint 5 : chargements et reprise après erreur
- Lot 4 confirmé : ceeff4dd697bcba6afeceda53b89d3cc439bf84f. Durée cumulée observée : 32.2 min.
- Défauts établis : userIdRef annulait le rechargement d’un autre salon pour le même utilisateur ; aucune protection contre réponses hors ordre ; une erreur vidait la liste sans avertissement de chargement dans l’agenda partagé.
- Correction : périmètre de requêtes propre à chaque hook, versions de requête et de contexte distinctes, protection des états de chargement/erreur, ancienne liste masquée dès le changement d’identité/salon, fenêtre fermée par remontage du workspace, erreur visible et reprise. Dernière liste du même contexte conservée après échec ; actions de disponibilités restent suspendues. Les mutations attendent aussi la relecture et n’appliquent pas une réponse d’une ancienne session à la nouvelle.
- Compatibilité constatée dans le contexte Caisse : les retours RPC peuvent être normalisés depuis une ligne unique. Le parseur d’encaissement accepte aussi un tableau d’une seule ligne, rejette les tableaux ambigus. Un test ajouté.
- Commit : « fix(agenda): order refreshes and isolate salon context [skip ci] », parent ceeff4dd697bcba6afeceda53b89d3cc439bf84f.
- Contrôles réels : premier typecheck a signalé l’import Button manquant, corrigé ; npm run typecheck final réussi ; npm test final 132/132, 18 fichiers (5 tests de périmètre de requêtes et 1 enveloppe RPC ajoutés) ; npm run build final réussi en 8.35 s ; build standalone sous VITE_PREVIEW_STANDALONE=true et VITE_PREVIEW_DEMO_ONLY=true réussi en 5.19 s ; npm run lint 0 erreur, 232 avertissements (les avertissements ajoutés par la fixture ont été supprimés) ; git diff --check réussi après retrait d’un espace final. Diff et flux React relus. Pas de recette navigateur exécutée.
- Contrôle de coût en lecture seule : API GitHub du dépôt confirme private=false, visibility=public ; les quatre workflows ont été relus. V2 CI utilise ubuntu-latest et cache npm, sans upload d’artifact ; aucune modification de workflow. Documentation officielle relue le 15 octobre : https://docs.github.com/en/billing/concepts/product-billing/github-actions et https://docs.github.com/en/actions/reference/runners/github-hosted-runners . Minutes standard gratuites sur dépôt public ; le stockage de cache au-delà de 10 Go peut être facturé si sa limite a été augmentée. Limite/usage du cache non établis ici : aucune exécution distante déclenchée, commits [skip ci] maintenus. Cette vérification partielle ne prouve pas le coût de Sites.
- Aperçu précédent conservé ; aucune intégration hébergée ni opération financière appelée. Une nouvelle instruction planifiée est arrivée pendant le travail : même session/bail conservés, aucun second développeur lancé.
- Prochaine étape : audit ciblé des écarts Caisse/Clients/statistiques, puis correctif de conservation du formulaire client si l’insertion échoue.
