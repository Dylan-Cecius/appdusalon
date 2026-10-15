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
- [ ] Recette navigateur : installation des binaires indisponible (archive invalide).

## Priorités prêtes, dans l'ordre
1. **P0 — Build mobile isolée et reproductible (code et contrôles locaux terminés ; recette navigateur restante).** Récupérer le code complet sans charger les secrets/données réels, vérifier lockfile et dépendances, établir un script de build mobile démo explicite. Garantir qu'aucun artefact de test ne se connecte au backend réel ; distinguer démo et candidat de diffusion. Exécuter les contrôles disponibles et auditer le besoin de mise à niveau Capacitor/Xcode/SDK selon les exigences actuelles.
2. **P0 — Projet iOS.** Vérifier la configuration native, préparer le projet iOS reproductible avec les ressources réelles, traiter l'identifiant et la signature comme non validés tant qu'aucune preuve Apple n'existe. Génération possible sans publication ; une compilation iOS nécessite un environnement compatible. Si ce prérequis manque, avancer sur P1.
3. **P1 — Ergonomie iPhone.** Navigation, safe areas, clavier, modales, scroll, agenda pastel, taille des cibles tactiles, mode paysage, accessibilité. Recette sur largeurs iPhone puis iPad ; ne pas présenter l'émulation web comme un essai natif.
4. **P1 — Session native.** Audit persistance de session, reprise après arrière-plan, reconnexion, liens de réinitialisation/deep links et stockage adapté. Tests synthétiques puis validation native lorsque possible.
5. **P1 — Parcours métier.** Agenda, création/modification de rendez-vous, clients, caisse et consultation des statistiques. Réutiliser les règles et droits V2, intégrer les correctifs web pertinents sans recopier les fichiers de pilotage web.
6. **P2 — Fonctions mobiles utiles.** Évaluer notifications pertinentes, états réseau/perte de connexion et accès en lecture contrôlé aux informations nécessaires ; définir avant d'implémenter les limites de confidentialité et synchronisation.
7. **P2 — Préparation Apple.** Auditer les règles en vigueur, valeur fonctionnelle mobile, confidentialité/données collectées, suppression de compte si création de compte, permissions minimales, politique de facturation SaaS distincte du paiement de prestations physiques. Préparer métadonnées et captures véridiques, support et mode de revue à données synthétiques.
8. **P3 — Candidat TestFlight.** Revue des preuves, compilation/signature sur environnement compatible et sans coût supplémentaire établi, recette native. Soumission/distribution seulement après autorisation spécifique et satisfaction des prérequis ; ne jamais inventer une acceptation Apple.

## Blocages connus et travail alternatif
- Identifiant Apple, équipe/signature et accès App Store Connect non inspectés. Ne bloque pas le code/UX/tests gratuits.
- Aucun environnement macOS/Xcode testé dans cette session. Ne bloque pas les tests web/unitaires et la préparation.
- Backend isolé et intégrations réelles non validés. Ne toucher à aucune donnée réelle ; les mocks ne prouvent pas leur fonctionnement.
- Le candidat web de départ contient 26 cas navigateur non exécutés selon V2_RELEASE_STATUS.md. Ne pas hériter de la mention « validé » sans les exécuter.
