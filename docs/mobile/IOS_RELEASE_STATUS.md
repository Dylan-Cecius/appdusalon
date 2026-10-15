# État de livraison iOS

## État initial — 15 octobre 2026
- Base V2 et configuration Capacitor : présentes.
- Configuration locale embarquée : corrigée et chargée avec succès sous Node 24.
- Vérification TypeScript et 141 tests métier : passants (pas des tests natifs).
- Build mobile démo isolée : produite, 2 tests de sûreté passants ; fichiers .env non chargés, ressources locales et connexions réseau bloquées par CSP.
- Recette navigateur : non exécutée à ce checkpoint ; Chromium indisponible, WebKit téléchargé mais bibliothèques Linux indisponibles (installation refusée par les permissions du runtime).
- Projet Xcode démo : généré dans ios-demo/ avec Capacitor 8.5.3, SPM et UIScene ; synchronisation répétée réussie.
- Icône et splash : placeholders réels du template Capacitor, à remplacer avant diffusion.
- Ergonomie : safe areas, clavier et navigation adaptés dans les sources ; 5 tests viewport passants. 8 cas WebKit préparés/détectés, non exécutés ; recette visuelle/native manquante.
- Dernier checkpoint de code vérifié avant ce lot : 31f196e66fee9496a044a22ab99e5e386ad14ad9.
- Compilation iOS / simulateur / iPhone réel : non réalisés.
- Identifiant, signature et équipe Apple : non vérifiés.
- Build TestFlight : non créée ni distribuée.
- Soumission App Store / validation Apple : aucune.

## Conditions de progression
1. Build isolée reproductible avec aucune connexion aux données réelles pendant les tests.
2. Tests web pertinents et tests des adaptations natives, avec preuves du commit exact.
3. Projet iOS et ressources, version Capacitor/SDK compatibles avec les règles actuelles.
4. Validation native des parcours essentiels, session, reprise, liens, clavier et réseau.
5. Revue confidentialité, permissions, suppression de compte et facturation selon les fonctions réellement livrées.
6. Environnement de compilation/signature et absence de coût supplémentaire établis.
7. Autorisation spécifique avant soumission/distribution ; examen Apple distinct de nos tests.

Ne jamais présenter une étape non réalisée comme terminée et ne pas calculer un pourcentage global artificiel.
