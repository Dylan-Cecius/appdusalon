# Autonomie AppDuSalon V2

Mandat de Dylan du 15 octobre 2026 : reproduire le fonctionnement de développement autonome de Nous Deux pour AppDuSalon V2 et cette conversation. Ce fichier fixe le périmètre ; il ne prouve pas qu'une session tourne actuellement.

## Périmètre et source de vérité
- Dépôt : Dylan-Cecius/appdusalon. Travailler uniquement sur v2/chatgpt-rebuild. Ne jamais modifier main ni fusionner sans nouvelle autorisation explicite.
- Relire AUTONOMY.md, AUTONOMY-BACKLOG.md, AUTONOMY-LOG.md, AUTONOMY-STATE.json, docs/V2_HANDOFF_2026-10-13.md et V2_RELEASE_STATUS.md avant de choisir une tâche.
- Préserver la direction existante : agenda pratique inspiré de Planity, couleurs pastel par prestation, parcours ordinateur/mobile, composants partagés avec la démonstration.
- L'aperçu existant est https://app-du-salon-v2-demo.hydan13.chatgpt.site/?view=agenda ; projet Sites appgprj_6ace2a13eeec8191a1c4f043ea53d075, propriétaire uniquement. Ne pas créer de second site ni élargir l'audience.
- Aucune dépendance au PC de Dylan ni à la conservation d'un dossier temporaire. Récupérer le dernier code depuis GitHub ; ne pas confondre fichiers locaux anciens et dernière révision.

## Cadence et travail utile
- Un cycle planifié chaque heure, jour et nuit, tous les jours ; il contrôle le dernier état puis poursuit les missions prêtes.
- Préparer environ 50 minutes de tâches successives, puis jusqu'à 10 minutes pour vérifications finales, journal et sauvegarde, dans les limites réelles du service.
- Enchaîner plusieurs tâches bornées si du travail prioritaire réalisable et du budget d'exécution restent disponibles. Ne pas s'arrêter au premier petit correctif par principe.
- Ne jamais attendre artificiellement, répéter des tests sans risque restant ni fabriquer des modifications pour remplir le temps.
- Sauvegarder chaque tâche utile, documenter toute interruption et ne jamais prétendre à une activité permanente entre les cycles ou à une durée non observée.
- Un seul développeur actif sur la branche. Aucun agent chef supplémentaire, automatisation en cascade ou boucle pour contourner les limites du service.

## Contrôle de reprise et concurrence
- Contrôler les commits et preuves de tests depuis le dernier checkpoint. Une activité de processus ou un commit ne prouve pas à lui seul un progrès validé.
- Utiliser AUTONOMY-STATE.json comme bail coopératif : identifiant unique de session, tâche, début, dernier checkpoint, expiration (au plus 75 minutes après le checkpoint). Claim et renouvellement par mise à jour de branche avec expected_sha.
- Si un autre bail non expiré existe, ne pas démarrer un second développeur ; examiner le progrès et laisser ce travail intact.
- Après expiration, relire la branche et le journal puis reprendre prudemment. Avant chaque écriture, vérifier que la session possède toujours le bail.
- Ne jamais forcer une référence Git, écraser une session concurrente ni annuler son CI. Si expected_sha échoue, relire et réconcilier.
- Libérer le bail en fin de session. En cas d'interruption brutale, la prochaine session utilise le checkpoint durable après expiration.

## Aucune dépense
- Aucun paiement, transfert, dépôt d'argent, achat, abonnement, domaine, achat de crédits, augmentation de budget ou ajout de moyen de paiement.
- Aucun runner, build distant, déploiement, SMS, e-mail facturé, API à l'usage ou autre opération potentiellement facturable sans preuve actuelle d'absence de coût supplémentaire.
- En cas de coût inconnu, bloquer cette seule opération, consigner le motif puis continuer un travail gratuit réalisable. Ne jamais acheter de quota.
- Les pushes sur cette branche déclenchent normalement GitHub Actions. Tant que la gratuité actuelle n'est pas établie, inclure [skip ci] dans chaque message de commit et ne pas lancer workflow_dispatch. Cela diffère un contrôle, ne le remplace pas : ne pas déclarer un candidat validé ou le publier si un contrôle nécessaire manque.
- Ne pas modifier les workflows ou contrôles requis pour rendre un résultat vert artificiellement.

## Données, publication et communication
- Pas de données réelles du salon, suppression réelle, migration hébergée, opération Stripe, modification DNS, publication sur stores ni production. Les déploiements staging nécessitent une autorisation spécifique et un coût nul vérifié.
- Ne pas utiliser les marqueurs de déclenchement des workflows de déploiement. Ne pas exposer de secret dans les logs, fichiers ou commits.
- Aucun SMS, e-mail, invitation ou message à un tiers.
- Le même aperçu privé peut être actualisé après les vérifications nécessaires et après vérification de l'absence de coût supplémentaire ; suivre le skill Sites. Garder VITE_PREVIEW_STANDALONE=true et VITE_PREVIEW_DEMO_ONLY=true. Ne jamais le connecter aux données réelles.
- Toute impossibilité de publier laisse l'aperçu précédent disponible et le code préparé dans GitHub, clairement distingués.

## Méthode et preuves
1. Lire l'état actuel et choisir une priorité prête ; vérifier que le travail n'est pas déjà fait.
2. Reproduire un défaut ou justifier le résultat concret recherché avant de modifier.
3. Modifier un périmètre cohérent, respecter l'accessibilité, le mobile et les droits existants.
4. Vérifier avec les outils réellement disponibles et appropriés : TypeScript, tests unitaires, build, parcours navigateur, tests SQL sur base jetable si nécessaire. Respecter les skills de l'environnement ; ne pas contourner une indisponibilité de navigateur.
5. Examiner le diff, sauvegarder avec expected_sha et mettre à jour backlog/journal/état.
6. Enchaîner la priorité suivante si possible ; réserver du temps pour le checkpoint final.
- Une copie de sources sans ressources binaires n'est pas une preuve d'aperçu complet. Ne pas inventer des assets, tests ou intégrations pour remplacer ceux qui manquent.
- Les dépendances externes et validations Supabase/Stripe/Resend/Twilio réelles restent distinctes des mocks et fixtures. Les contrôles de V2_RELEASE_STATUS.md demeurent nécessaires.
- Si le runtime manque, faire les lectures et diagnostics utiles, enregistrer les limites et ne pas prétendre avoir exécuté des tests.

## Rapports
- Progrès ordinaires dans AUTONOMY-LOG.md ; inclure heure UTC, durée observée, mission, fichiers/commit, commandes et résultats réels, limites et prochaine étape.
- Répondre dans ChatGPT pendant un cycle uniquement pour un nouveau blocage nécessitant Dylan ou un incident réel.
- Bilan quotidien en français vers 08:00 dans le fuseau configuré de Dylan : changements enregistrés, validations, blocages et prochaine priorité. Lecture seule ; aucune opération facturable.
- Ne pas donner un pourcentage global inventé. Distinguer code préparé, testé, aperçu publié et backend réel validé.
