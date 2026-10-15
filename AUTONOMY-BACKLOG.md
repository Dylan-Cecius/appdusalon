# Priorités de développement autonome AppDuSalon V2

Lire AUTONOMY.md avant toute action. État initial du 15 octobre 2026 ; les tâches ci-dessous sont des priorités à examiner, pas des défauts affirmés.

## Réalisé et sauvegardé
- Recherche agenda, filtres et badges ; grille et étapes réservées ; couleurs pastel.
- Liste d'attente, indisponibilités, création composée et séries.
- Contacts/historique, déplacements guidés avec conservation du prix et de l'acompte.
- Recherche de créneaux à la création pour un collaborateur ou toute l'équipe, y compris séries.
- Dernier code applicatif validé : 86e4f6cdfe7aca8ca5a3b835c8903f8562415d76. Documentation de reprise : 9e4465a333fafa6a1c17f7c74f17606e3b3bff9a.
- CI applicative 38561490094 : 99 unitaires, 99 navigateur, 6 sécurité d'aperçu ; 3 scénarios de grille ignorés sur mobile ; lint 0 erreur, 234 avertissements.
- Dernier SQL inchangé depuis CI base 38444612019. Ces preuves historiques ne valident pas une modification future.
- Aperçu privé Sites : déploiement appgdep_6acf7158d7288191a2ace0a51208bac2, source 740f8758eab36e5a30cf03a14f9f76dfe5605dd3.

## Priorités prêtes
1. Restaurer un environnement reproductible et vérifier la dernière révision, les tâches ouvertes et les limites d'exécution/coût. Choisir ensuite un lot utile ; ne pas refaire les fonctionnalités listées comme réalisées.
2. Revoir le parcours de fiche après création/déplacement : annulation, absent, sauvegarde, erreur serveur et rafraîchissement. Reproduire avant de corriger ; préserver les acomptes et éviter tout faux succès. Utiliser des données fictives.
3. Recette agenda sur mobile et clavier : changements de date/collaborateur, formulaires longs, chargement/erreur/état vide et cohérence après rechargement. Améliorer les points concrets observés sans refonte arbitraire.
4. Évaluer les écrans Caisse, Clients et statistiques existants : repérer les écarts fonctionnels entre l'application connectée et l'aperçu, prioriser un parcours complet utile et les incohérences de statut/montants. Ne pas présenter une simulation comme un encaissement réel.
5. Compléter les scénarios d'intégration isolés manquants, la documentation de reprise et les critères de livraison, sans déployer un backend réel.
6. Une fois ces priorités couvertes, réexaminer les besoins déjà convenus et proposer dans le backlog les prochains lots à valeur démontrable. Ne pas empiler des fonctionnalités redondantes ni modifier le nom commercial sans décision de Dylan.

## Bloqués par prérequis
- CI distante et publication supplémentaires : preuve actuelle d'absence de coût additionnel, sinon tests dans le runtime disponible et commits [skip ci].
- Backend hébergé isolé : projet et configuration validés, coût nul vérifié, autorisation spécifique, puis recette des fournisseurs de V2_RELEASE_STATUS.md.
- Production/main/stores, données réelles et opérations financières : hors autorisation.

## Checkpoint du 15 octobre — fiche rendez-vous, lot 1
- Checkout GitHub restauré et dépendances verrouillées installées dans le cloud.
- Attente des mutations de fiche, verrou commun contre les doubles actions, erreurs visibles et conservation des saisies après échec. Annulation/absence/encaissement attendent la sauvegarde d’un brouillon.
- Typecheck et 101 tests unitaires réussis ; build standalone réussi. Six scénarios navigateur ajoutés pour ordinateur/mobile, non exécutés dans cet environnement.
- À poursuivre : statuts terminaux, informations de paiement et sauvegarde des coordonnées ; recette navigateur requise avant publication.

## Checkpoint du 15 octobre — statuts de fiche, lot 2
- Lot 1 sauvegardé : 174ab02dfb772877e091988eaddb34aa215ffc6e.
- Règles de fiche centralisées : historique en lecture seule ; aucun encaissement/achèvement pour terminé/annulé/absent, paiement en attente/remboursé/expiré. Acompte préservé, solde uniquement pour dossier pertinent, prépaiement sans nouvel encaissement. Badge partagé avec l’agenda.
- 113 tests unitaires et typecheck réussis ; build standalone réussi. Dix scénarios navigateur de fiche préparés (20 cas ordinateur/mobile), toujours non exécutés.
- Prochaine priorité : mise à jour des coordonnées et détection de faux succès côté persistance.

## Checkpoint du 15 octobre — sauvegarde, lot 3
- Lot 2 sauvegardé : b5867d1a19500518ce925c59e8e1f2561469f0e8.
- Coordonnées : effacement du téléphone/notes transmis, champs de réservation et paiement exclus du formulaire, mise à jour conditionnée au salon et à la révision de la fiche ouverte, absence de ligne retournée traitée comme conflit. Démo alignée sur le contrôle de concurrence.
- 119 tests unitaires et typecheck réussis ; build standalone réussi. Six tests de persistance avec faux client Supabase ; aucun appel hébergé.
- À poursuivre : réponses d’annulation idempotentes et montants après règlement confirmé.

## Checkpoint du 15 octobre — résultats des mutations, lot 4
- Lot 3 sauvegardé : 9b9ac86e1d50ec45f173f6f04cc829dd2674430c.
- Annulation : statut confirmé conservé sur réponse idempotente, absence/remboursement distingués, acompte conservé, paiement en attente expiré uniquement à l’annulation.
- Encaissement : transaction, rendez-vous, salon et montant validés avant état de succès ; drapeaux et montant payé alignés avec le retour serveur. Clôture prépayée explicitement sans nouvel encaissement. Démo protégée des actions sur dossiers clos.
- 126 tests unitaires et typecheck réussis, build normal réussi. Aucun fournisseur réel appelé ; contrat testé avec payloads fictifs.
- À poursuivre : gestion des chargements concurrents et changement de salon dans le hook agenda.
