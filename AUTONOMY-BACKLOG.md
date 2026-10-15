# Backlog autonome — AppDuSalon V2 iOS

## Terminé lors de l'initialisation
- [x] Lire les paramètres des deux agents existants et confirmer l'accès GitHub.
- [x] Inventorier le dépôt : React/Vite, Capacitor 7.4.3 déclaré, configuration mobile héritée, aucun dossier ios/ ni projet Xcode dans l'arbre au checkpoint 8a6933c853544e6629bad6d0d62e1097213adaf8.
- [x] Décider de reprendre la V2 et de travailler sur une branche iOS distincte.
- [x] Retirer server.url et cleartext du fichier Capacitor ; renommer l'app en AppDuSalon V2 en conservant provisoirement l'appId hérité.
- [x] Charger la configuration sous Node 24 et vérifier les valeurs. Cela ne valide pas une build iOS.

## Checkpoint du premier cycle
- [x] Build mobile démo autonome, sans chargement .env ni modules backend.
- [x] 2 tests de sûreté de build, TypeScript et 136 tests métier passants.
- [x] Projet iOS démo SPM/UIScene généré et synchronisé, Capacitor 8.5.3 verrouillé, tests locaux repassés.
- [x] Sources safe areas/clavier/navigation adaptées ; 5 tests viewport passants, 141 tests métier au total.
- [x] Recette WebKit isolée préparée : 8 cas reconnus sur iPhone/iPad, exécution restante.
- [x] Audit session native ; courses de restauration/événements, publication du jeton et déconnexion corrigées : 11 tests ciblés, 152 tests au total. Compilation complète isolée passante.
- [ ] Recette navigateur : Chromium indisponible ; WebKit téléchargé, bibliothèques Linux indisponibles (installation refusée par les permissions du runtime).

## Priorités prêtes, dans l'ordre
1. **P0 — Build mobile isolée et reproductible (code et contrôles locaux terminés ; recette navigateur restante).** Récupérer le code complet sans charger les secrets/données réels, vérifier lockfile et dépendances, établir un script de build mobile démo explicite. Garantir qu'aucun artefact de test ne se connecte au backend réel ; distinguer démo et candidat de diffusion. Exécuter les contrôles disponibles et auditer le besoin de mise à niveau Capacitor/Xcode/SDK selon les exigences actuelles.
2. **P0 — Projet iOS (démo générée ; compilation et recette natives restantes).** Vérifier la configuration native, préparer le projet iOS reproductible avec les ressources réelles, traiter l'identifiant et la signature comme non validés tant qu'aucune preuve Apple n'existe. Génération possible sans publication ; une compilation iOS nécessite un environnement compatible. Si ce prérequis manque, avancer sur P1.
3. **P1 — Ergonomie iPhone (premier lot implémenté/testé unitairement ; recette visuelle restante).** Navigation, safe areas, clavier, modales, scroll, agenda pastel, taille des cibles tactiles, mode paysage, accessibilité. Recette sur largeurs iPhone puis iPad ; ne pas présenter l'émulation web comme un essai natif.
4. **P1 — Session native (pont/liens/cycle préparés et testés sur fixtures ; stockage adapté et recette native restants).** Audit persistance de session, reprise après arrière-plan, reconnexion, liens de réinitialisation/deep links et stockage adapté. Tests synthétiques puis validation native lorsque possible.
5. **P1 — Parcours métier.** Agenda, création/modification de rendez-vous, clients, caisse et consultation des statistiques. Réutiliser les règles et droits V2, intégrer les correctifs web pertinents sans recopier les fichiers de pilotage web.
6. **P2 — Fonctions mobiles utiles.** Évaluer notifications pertinentes, états réseau/perte de connexion et accès en lecture contrôlé aux informations nécessaires ; définir avant d'implémenter les limites de confidentialité et synchronisation.
7. **P2 — Préparation Apple.** Auditer les règles en vigueur, valeur fonctionnelle mobile, confidentialité/données collectées, suppression de compte si création de compte, permissions minimales, politique de facturation SaaS distincte du paiement de prestations physiques. Préparer métadonnées et captures véridiques, support et mode de revue à données synthétiques.
8. **P3 — Candidat TestFlight.** Revue des preuves, compilation/signature sur environnement compatible et sans coût supplémentaire établi, recette native. Soumission/distribution seulement après autorisation spécifique et satisfaction des prérequis ; ne jamais inventer une acceptation Apple.

## Blocages connus et travail alternatif
- Identifiant Apple, équipe/signature et accès App Store Connect non inspectés. Ne bloque pas le code/UX/tests gratuits.
- Aucun environnement macOS/Xcode testé dans cette session. Ne bloque pas les tests web/unitaires et la préparation.
- Backend isolé et intégrations réelles non validés. Ne toucher à aucune donnée réelle ; les mocks ne prouvent pas leur fonctionnement.
- Le candidat web de départ contient 26 cas navigateur non exécutés selon V2_RELEASE_STATUS.md. Ne pas hériter de la mention « validé » sans les exécuter.

## Reprise après le cycle clos 2026-10-15T14:01:38.092Z
- Dernier code : 52220ffb195b357acefeac27ef2dd89968e177a2. Quatre checkpoints de développement, 46 minutes observées ; bail libéré.
- Premier lot encore prêt : spécifier et tester strictement les callbacks natifs sur fixtures (origine/chemin autorisés, type de flux, doublons, démarrage/reprise), puis raccorder le pont App lorsque ses prérequis sont établis. Voir SESSION_AUDIT.md.
- Garder ouverts les contrôles visuels des marges/clavier/menus et les essais iOS ; ne pas les cocher sur la base des tests unitaires ou de --list.

## Cycle 2 terminé
- [x] Contrat de callbacks PKCE strict et contrôleur indépendant : 42 tests synthétiques passants.
- [x] Raccorder démarrage à froid/appUrlOpen sous configuration native explicite : 51 tests natifs ciblés, 203 au total ; aucun callback hébergé ni schéma Apple enregistré.
- [x] Cycle App de rafraîchissement unique préparé et raccordé sous opt-in : 12 tests synthétiques de cycle/remontage passants.
- [x] Garde des flux locaux avant échange PKCE : marqueur aléatoire consommé une seule fois, 18 tests dédiés ; 239 tests au total.
- [x] Erreurs fournisseur en fragment prises en charge sans jeton : 101 tests natifs passants ; recette native toujours manquante.
- [x] Commandes tactiles de l’agenda/création : minimum 44 px en petit écran ou pointeur grossier ; 12 cas navigateur préparés, non exécutés.
- [x] Panneaux latéraux adaptés au viewport visible et aux safe areas ; fermeture 44 px/français, hauteurs internes flexibles. 20 cas navigateur découverts, non exécutés.
- [x] Nettoyage défensif du marqueur si le contrat SDK retourne déjà une session : 20 tests ciblés passants ; ne rend pas PKCE compatible avec autoconfirm.

## Reprise après le cycle clos 2026-10-15T15:03:54Z
- Huit checkpoints indépendants ; dernier code 2078b4178d9618b9513e8e60a79f4c2f7410ed5d. Durée observée : 49 min 13 s ; bail libéré.
- Prochain lot gratuit prêt : audit et corrections des parcours mobiles agenda/clients/caisse (sélecteur de date, déplacement sans drag obligatoire, formulaires et confirmation des mutations), avec fixtures synthétiques. Reprendre le code courant et sélectionner un défaut concret avant chaque correction.
- Conserver ouverts les 20 cas WebKit non exécutés et la recette native des liens/UIScene/clavier ; absence de Xcode, stockage Keychain et backend isolé toujours non résolue. La préparation opt-in ne constitue pas un candidat connecté distribuable.

## Cycle 3 — brouillon à reprendre
- [ ] Revoir le lot caisse sauvegardé : verrou synchrone anti-double-appui, panier conservé sans résultat identifié, contrôles désactivés pendant l’enregistrement. 11 tests ciblés et TypeScript passants ; compilation connectée isolée passante. Revue finale et recette d’intégration restantes.
- [ ] Priorité suivante : isoler les alertes stock/journal après le RPC confirmé ; leur échec ne doit pas transformer une vente déjà enregistrée en échec à réessayer. Dédupliquer également réponse RPC/événement temps réel.
- [ ] Fiche client : updateClient absorbe les échecs et handleSave ferme l’édition ; conserver les saisies et exiger confirmation avant fermeture.

## Cycle 4 — checkpoint caisse 2026-10-15T15:25:33Z
- [x] Brouillon 507f006 revu : traitement mobile partagé, prestataire transmis et panneau conservé jusqu’à confirmation ; échecs stock/journal séparés de la vente confirmée ; déduplication RPC/INSERT.
- [x] 16 tests synthétiques ciblés, TypeScript et compilation source isolée passants ; recette UI/backend/native toujours restante.
- [ ] Isoler les données de transaction lors d’un changement de session/salon et les retours asynchrones tardifs.
- Prochaine priorité prête : confirmation d’édition de fiche client, puis périmètre des données de caisse.

## Cycle 4 — checkpoint client 2026-10-15T15:29:57Z
- [x] Édition client : champs conservés tant que l’ID attendu n’est pas confirmé ; verrou synchrone, erreurs accessibles, retour serveur répercuté dans la liste et la fiche.
- [x] Statistiques : callback stabilisé et réponse de fiche fermée ignorée ; chargement séparé du brouillon pour éviter les réinitialisations pendant la saisie.
- [x] Patch limité aux champs éditables ; notes omises sans droit, filtre salon ajouté à la mise à jour. 11 tests ciblés/TypeScript/compilation source isolée passants.
- [ ] Recette interactive réelle du formulaire et limites de session des listes clients restent à traiter.

## Cycle 4 — checkpoint flux transactions 2026-10-15T15:34:36Z
- [x] Requêtes, mutations et événements bornés à la génération utilisateur/salon ; données anciennes masquées au rendu, abonnements nettoyés puis recréés au remontage.
- [x] Un seul flux transactions partagé avec les statistiques ; façade historique préservée, associations client/prestataire conservées. Rafraîchissements ordonnés après événement/confirmation pour éviter un ancien instantané.
- [x] Suite complète : 286 tests/32 fichiers ; TypeScript et compilation isolée passants.
- [ ] Rendre visible l’échec d’actualisation de l’historique ; conserver les dernières données sans les présenter comme à jour.

## Cycle 4 — checkpoint actualisation 2026-10-15T15:38:22Z
- [x] Erreur d’historique visible dans le cadre commun et la modale ; actualisation manuelle disponible, données connues conservées.
- [x] Caisse/historique sans faux zéro lors d’un chargement initial en attente/échec ; cents affichés dans le résumé caisse. Liste de la modale dérivée directement pour éviter un rendu de l’ancien salon ; date civile sans conversion UTC implicite.
- [x] Rafraîchissement après abonnement/reconnexion et signal d’erreur du canal préparés. 9 tests ciblés, TypeScript et compilation isolée passants ; recette réseau/UI restante.

## Cycle 4 — checkpoint portée clients 2026-10-15T15:41:56Z
- [x] Lectures/mutations/abonnement clients bornés au contexte utilisateur/salon ; résultats tardifs ignorés, liste ancienne masquée et erreurs visibles.
- [x] Fiches/brouillons/confirmations réinitialisés lors du changement de session ; export en cours abandonné avant téléchargement si le contexte a changé. Export désactivé avec liste en chargement/échec.
- [x] 16 tests existants de portée/édition, TypeScript et compilation isolée passants.
- [ ] Statistiques : les erreurs Supabase retournées sont encore absorbées en zéro ; traiter explicitement l’indisponibilité et l’export incomplet.

## Cycle 4 — checkpoint statistiques client 2026-10-15T15:45:57Z
- [x] Résultats Supabase en erreur/absents/invalides distingués d’un historique vide ; zéro réservé aux deux requêtes réussies sans ligne. Règles V2 de total/visites conservées.
- [x] Fiche : états chargement/indisponibilité/réessai, montants inconnus non affichés à zéro. Export incomplet bloqué avant téléchargement, erreur affichée, verrou contre double demande.
- [x] 7 tests synthétiques ciblés, TypeScript et compilation isolée passants ; aucune donnée/export réel.

## Cycle 4 — checkpoint panier tactile 2026-10-15T15:52:02Z
- [x] CartPanel réutilisable sans backend, commandes nommées et cibles 44 px au tactile, noms longs repliables, paiement en une colonne sur très petit écran.
- [x] Panneau mobile avec zone défilante/fermeture explicite et safe areas/viewport ; placement clavier centralisé (repositionnement Vaul désactivé pour ce panneau).
- [x] Démo mobile dédiée ?mobile-cart=1, données synthétiques, composants de production partagés ; entrée PreviewStandalone/Sites non modifiée.
- [x] TypeScript, 2 tests de sûreté, compilation source isolée, build/sync démo passants.
- [ ] 28 cas navigateur préparés/découverts (8 nouveaux panier), aucun exécuté ; recettes visuelles/natives restent ouvertes.
- [ ] Préserver le prestataire lors de la bascule mobile/bureau et retirer le panier d’un contexte utilisateur/salon précédent.

## Cycle 4 — checkpoint état du panier 2026-10-15T15:55:03Z
- [x] Sélection du prestataire partagée par les présentations mobile/bureau et conservée après fermeture/réouverture ; brouillon retiré quand la clé utilisateur/salon change.
- [x] Erreur de panier focalisée pour être visible après un appui en bas d’une liste longue.
- [x] Suite complète 293 tests/33 fichiers, TypeScript, compilation isolée et build/sync démo passants.
- [ ] 32 cas navigateur préparés/découverts (12 panier), aucun exécuté ; rotation, fermeture et changements de session restent à recetter en UI/native.

## Cycle 4 — checkpoint source de fiche 2026-10-15T15:57:20Z
- [x] Fiche alimentée par les fonctions/lignes de sa page : plus de second chargement/abonnement clients ni de dépendance à une copie non chargée pour réessayer les statistiques.
- [x] Lecture de la ligne courante pour la fiche ; édition en cours conservée face au rafraîchissement. TypeScript et compilation isolée passants.
- [ ] Export CSV : seuls les guillemets des notes sont actuellement échappés ; traiter tous les champs texte et les valeurs interprétables en formule avant clôture.

## Cycle 4 — checkpoint CSV 2026-10-15T16:02:22Z
- [x] Tous les champs CSV échappés (guillemets, virgules, sauts de ligne), séparateurs CRLF ; préfixe tabulation sur texte potentiellement interprétable en formule. JSON conserve les valeurs pour réimportation ; indication dans la confirmation CSV.
- [x] 18 tests synthétiques, TypeScript et compilation isolée passants. Aucun export réel.
- [ ] Vérifier ouverture/réenregistrement avec les tableurs cibles : aucun mécanisme CSV universel contre les formules. Vérifier le téléchargement natif avant diffusion.

## Reprise prioritaire après les dix lots du cycle 4 — 2026-10-15T16:04:04Z
Les cases historiques ci-dessus décrivent leur checkpoint ; les points suivants font foi pour la reprise.
- [x] Caisse confirmée, édition client, portées de session/listes, erreurs/statistiques, panier tactile/prestataire et CSV : sources préparées dans dix lots indépendants ; limites UI/native conservées.
- [ ] Prochain lot gratuit : auditer le parcours mobile de création/modification de rendez-vous (confirmation de mutation, saisies conservées, contexte session/salon, navigation sans drag obligatoire) sur le code actuel et fixtures synthétiques. Conserver les couleurs pastel.
- [ ] Ensuite : audit de restitution des statistiques en cas d’erreur/chargement, et téléchargement/partage natif des exports (aucune dépendance ni service payant sans preuve).
- [ ] Recettes ouvertes : 32 cas navigateur, montage React/changement de session réel, tableurs/CSV et iPhone/iPad. Blocages connus : bibliothèques WebKit indisponibles, pas de Xcode/signature/backend isolé. Ne pas retenter les mêmes installations refusées.

Clôture 2026-10-15T16:04:45Z : 50 min 10 s observées, dix lots fonctionnels plus audit 684d082cd2bca990f6138d3aab4c4d9af5efd845. Bail libéré ; priorité prête : agenda mobile et confirmations de mutations. Les contrôles UI/natifs manquants restent ouverts.

## Cycle 5 — 2026-10-15T16:17:44Z : Créations agenda confirmées
- [x] Créations agenda confirmées : sources préparées, preuves et limites dans le journal.
- [ ] Borner toutes les mutations agenda au contexte courant et vérifier les confirmations de déplacement.

## Cycle 5 — 2026-10-15T16:20:24Z : Mutations agenda bornées à la session
- [x] Mutations agenda bornées à la session : sources préparées, preuves et limites dans le journal.
- [ ] Réconcilier la fiche ouverte avec les mises à jour de l’agenda en conservant les brouillons et leur révision.

## Cycle 5 — 2026-10-15T16:22:57Z : Fiche agenda actualisée sans perte de brouillon
- [x] Fiche agenda actualisée sans perte de brouillon : sources préparées, preuves et limites dans le journal.
- [ ] Préparer une fixture mobile isolée pour les erreurs de création/édition et la concurrence de fiche ; contrôler les données de disponibilité.

## Cycle 5 — 2026-10-15T16:26:38Z : Formulaires agenda mobiles et fixture isolée
- [x] Formulaires agenda mobiles et fixture isolée : sources préparées, preuves et limites dans le journal.
- [ ] Contrôler les instantanés de disponibilités et les événements de reconnexion de l’agenda ; exécuter la suite complète pertinente.

## Cycle 5 — 2026-10-15T16:29:05Z : Disponibilités et reconnexion agenda explicites
- [x] Disponibilités et reconnexion agenda explicites : sources préparées, preuves et limites dans le journal.
- [ ] Isoler aussi les indisponibilités de l’équipe par utilisateur et confirmer leurs mutations avant fermeture.

## Cycle 5 — 2026-10-15T16:31:14Z : Indisponibilités isolées et confirmées
- [x] Indisponibilités isolées et confirmées : sources préparées, preuves et limites dans le journal.
- [ ] Empêcher les doubles appuis et la fermeture du panneau d’indisponibilité pendant une sauvegarde ; conserver les saisies en échec.
