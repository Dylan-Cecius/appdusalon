# Priorités de développement autonome AppDuSalon V2

Lire AUTONOMY.md avant toute action. État initial du 15 octobre 2026 ; les tâches ci-dessous sont des priorités à examiner, pas des défauts affirmés.

## Réalisé et sauvegardé
- Recherche agenda, filtres et badges ; grille et étapes réservées ; couleurs pastel.
- Liste d'attente, indisponibilités, création composée et séries.
- Contacts/historique, déplacements guidés avec conservation du prix et de l'acompte.
- Recherche de créneaux à la création pour un collaborateur ou toute l'équipe, y compris séries.
- Dernière référence applicative validée par la CI complète : 86e4f6cdfe7aca8ca5a3b835c8903f8562415d76. Documentation de reprise : 9e4465a333fafa6a1c17f7c74f17606e3b3bff9a.
- CI applicative 38561490094 : 99 unitaires, 99 navigateur, 6 sécurité d'aperçu ; 3 scénarios de grille ignorés sur mobile ; lint 0 erreur, 234 avertissements.
- Dernier SQL inchangé depuis CI base 38444612019. Ces preuves historiques ne valident pas une modification future.
- Aperçu privé Sites : déploiement appgdep_6acf7158d7288191a2ace0a51208bac2, source 740f8758eab36e5a30cf03a14f9f76dfe5605dd3.

## Priorités prêtes
1. Lire les nouveaux checkpoints puis exécuter la recette des 42 nouveaux cas de fiche RDV/création client/statistiques/rapports/panier sur ordinateur/mobile dès qu’un navigateur autorisé ou une CI sans coût additionnel vérifié est disponible. Ne pas confondre découverte/typecheck des tests et exécution.
2. Stabiliser la fiche client : getClientStats recréé à chaque rendu relance son effet et peut réinitialiser les saisies. Séparer brouillon et lecture, ignorer les réponses périmées ; critères détaillés dans docs/V2_REVIEW_2026-10-15.md. Ensuite auditer les rapports automatiques serveur (erreurs/pagination/périodes), sans envoi réel. Panier mobile et rapports interactifs déjà corrigés.
3. Source transactions unifiée, changement de salon et pagination protégés : recette navigateur/hébergée à faire, notamment erreurs et reprises avec plusieurs pages. Ne pas refaire la lecture commune.
4. Revoir chargement/erreur de la liste Clients, recherche accents/téléphones et cohérence du détail ; la création a été corrigée au lot 6, ne pas la refaire. Recette mobile/clavier des longs formulaires, focus après échec et fermeture à vérifier.
5. Préparer un parcours fictif complet agenda → caisse → historique client → statistiques, avec un état partagé, pour remplacer progressivement les écrans de démonstration encore statiques. Conserver les composants partagés et distinguer simulation/connexion réelle.
6. Poursuivre les validations d’intégration isolées et critères de livraison suivant V2_RELEASE_STATUS.md. Aucun renommage commercial ni nouvelle fonction redondante sans besoin démontré.

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

## Checkpoint du 15 octobre — rafraîchissements, lot 5
- Lot 4 sauvegardé : ceeff4dd697bcba6afeceda53b89d3cc439bf84f.
- Chargements agenda ordonnés : seule la requête la plus récente du contexte utilisateur/salon actif peut modifier liste, erreur et chargement. Changement de salon du même utilisateur pris en compte ; ancienne fiche fermée par changement de contexte.
- Échec de rafraîchissement : dernière liste conservée avec avertissement et bouton de reprise, disponibilités toujours bloquées. Les confirmations de mutations d’un contexte précédent ne modifient pas l’écran courant. Rafraîchissement après annulation/encaissement confirmé.
- 132 unitaires et typecheck réussis ; builds normal et standalone réussis ; lint 0 erreur, 232 avertissements. Dix scénarios navigateur de fiche restent préparés, non exécutés.
- Vérification de coût du 15 octobre : dépôt public et runner ubuntu-latest standard, minutes gratuites selon GitHub ; le cache npm est activé et sa limite/usage actuel ne sont pas établis. Maintenir [skip ci], aucun dispatch. Aucun workflow modifié.

## Checkpoint du 15 octobre — création client, lot 6
- Lot 5 sauvegardé : 182d15d9e72629d47012ee2d177116bc2b957864.
- Nouveau client : fermeture/effacement uniquement après résultat confirmé, saisies conservées sur retour null ou exception, verrou de soumission partagé, erreur accessible avec focus, défilement de formulaire long, restauration du focus via DialogTrigger.
- Date de naissance facultative omise lorsqu’elle est vide (colonne DATE) ; nom/téléphone normalisés, droits sur notes conservés. Aucun contact réel créé.
- 136 unitaires et typecheck réussis ; build normal final réussi ; lint 0 erreur/232 avertissements. Quatre fixtures/specs nouvelles vérifiées par TypeScript. 26 cas navigateur découverts, non exécutés.
- Audit des écarts et critères du prochain lot : docs/V2_REVIEW_2026-10-15.md. Le code préparé n’est pas la version publiée de l’aperçu.

## Fin de session — 2026-10-15T12:45:29Z
- Six lots sauvegardés ; dernier code applicatif : 498c8a487a327c661555a15321ea90fca0030934. Bail libéré. Prochaines priorités et critères inchangés ci-dessus ; ne pas refaire les lots terminés.
- Contrôles manquants : recette navigateur et intégrations isolées requises, distinctes des 136 tests unitaires locaux. Aperçu publié inchangé.

## Répartition — calcul pur préparé
- Calcul en centimes et périodes Europe/Brussels : 15 nouveaux tests réussis, suite 151/151. Pas encore utilisé par les écrans à ce checkpoint. À poursuivre : lecture des parts, normalisation et affichage partagé.

## Répartition — intégration réalisée
- Statistiques principales, jours personnalisés et historique utilisent le calcul commun et les parts de paiement. 157 tests réussis, typecheck/build réussis ; 4 nouveaux cas navigateur préparés, non exécutés (30 avec les lots précédents).
- Chargement/contexte des transactions et autres rapports restent à traiter. Aperçu non actualisé.

## Transactions — source commune réalisée
- Un provider et abonnement par session ; hook historique adapté. 166 unitaires, typecheck/build réussis, lint 0 erreur/218 avertissements. Erreurs visibles et rapports suspendus si chargement incomplet. Aucun contrôle hébergé réalisé.

## Rapports — filtres des parts réalisés
- 173 unitaires réussis ; typecheck et build réussis. 6 nouveaux cas navigateur préparés, non exécutés (36 cumulés). Génération e-mail encore à aligner ; aucun envoi réel.

## Rapports — texte local aligné
- 180 tests unitaires réussis ; typecheck/build réussis, lint 0 erreur/216 avertissements. Aperçu et texte généré réutilisent les parts communes. Aucun e-mail transmis. Recette du formulaire restant à faire.

## Caisse — confirmation et prestataire
- Prestataire transmis sur mobile, fermeture et effacement après confirmation seulement ; panier verrouillé contre les actions simultanées, erreur visible avec saisies conservées. Changement de salon réinitialise le panier.
- 189 unitaires, typecheck/build réussis ; lint 0 erreur/216 avertissements. Six cas navigateur supplémentaires découverts et typecheckés, non exécutés (42 cumulés). Aucune vente ni opération financière réelle effectuée.

## Fin du cycle — 2026-10-15T13:39:38.419833+00:00
- Six lots applicatifs supplémentaires sauvegardés ; dernière source : 06d846510550e2c37af74a4dc932797cb0ce940b. 189 unitaires réussis, typecheck/builds réussis ; 42 cas navigateur nouveaux restent non exécutés. Aperçu inchangé.
- Revue Clients et rapports automatiques consignée avec critères de reprise. Bail libéré ; aucune tâche facturable ou activité entre cycles n’est prétendue.

## Clients — stabilité de la fiche
- Lecture des statistiques stabilisée et séparée du brouillon ; réponses après fermeture/changement ignorées. Typecheck, 189 unitaires et build réussis ; six cas navigateur supplémentaires préparés (48 cumulés), non exécutés. Source Clients et erreurs/pagination à poursuivre.
