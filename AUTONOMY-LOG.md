# Journal — AppDuSalon V2 iOS

## 2026-10-15T12:59:44.893Z — Initialisation du troisième agent
- Mandat : branche dédiée v2/ios-appstore issue de 8a6933c853544e6629bad6d0d62e1097213adaf8, avec cadence/limites reprises des deux agents existants.
- Audit : dépendances Capacitor déclarées et configuration distante Lovable ; aucun dossier ios/ ni projet Xcode au checkpoint inspecté.
- Décision : conserver les fonctions V2 et reprendre Capacitor ; aucune réécriture totale justifiée.
- Premier correctif : capacitor.config.ts charge désormais dist embarqué par défaut (server.url retiré), retire cleartext et porte le nom AppDuSalon V2. appId hérité conservé provisoirement, non vérifié auprès d'Apple.
- Contrôle exécuté sous Node v24.19.0 : import TypeScript natif de la configuration puis assertions appName/webDir/absence server.url/absence cleartext true/appId préservé. Résultat : PASS.
- Aucune suite complète, build web/native, installation, signature, soumission, migration, notification ou dépense exécutée dans cette initialisation.
- Les workflows existants ciblent v2/chatgpt-rebuild ou une PR vers main ; aucun workflow modifié ni lancé, aucune PR créée.
- Durée de travail : environ cinq minutes à ce checkpoint ; pas une session de développement d'une heure.
- Prochaine tâche : P0 build mobile isolée et vérification des prérequis natifs.
- Activation des automations : confirmer leurs identifiants dans AUTONOMY-STATE.json après création réussie.

## 2026-10-15T13:02:16.195Z — Activation vérifiée
- Deux automations créées et relues avec is_enabled=true : Développement AppDuSalon iOS et Bilan AppDuSalon iOS.
- Cycles horaires à :15 dès 14:15 le 15 octobre 2026, bilan quotidien vers 08:00 dès le 16 octobre ; fuseau fourni par la conversation : Etc/GMT-1.
- Identifiants et calendriers enregistrés dans AUTONOMY-STATE.json. Les deux agents existants n'ont pas été modifiés.
- Branche distante relue au commit a35492e7e2187794d750795cd9b7967c5a1542db. La création d'une tâche ne prouve pas encore l'exécution de son premier cycle.

## 2026-10-15T13:22:47.608Z — Checkpoint 1 : démonstration mobile isolée
- Session ios-2026-10-15T13-14-44-195Z, début 2026-10-15T13:14:44.195Z, durée écoulée observée 8 minutes.
- Checkout Git complet récupéré, assets présents. npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund : succès (521 paquets).
- Nouvelle entrée mobile/index.html + src/mobile-demo.tsx : données synthétiques uniquement, ressources locales, CSP connect-src 'none', pas de police externe.
- npm run build:mobile:demo : succès ; Vite InlineConfig envFile=false ignore les fichiers .env et variables VITE héritées. Le graphe de modules interdit App/main et les clients Supabase.
- npm run test:mobile:build : 2 tests passants (import connecté interdit, environnement backend hostile ignoré). Aucun secret du .env suivi chargé par ces commandes.
- npm run typecheck : succès. Suite métier via startVitest('test', ['src'], {run:true}, {envFile:false}) : 136 tests dans 19 fichiers, tous passants.
- Avertissements : bundle démo JS 552,21 kB avant compression ; base Browserslist ancienne. Pas de mise à niveau non motivée effectuée.
- Playwright : navigateurs absents ; installation Chromium/WebKit tentée, archives Chromium invalides. Recette navigateur non exécutée, pas de preuve native.
- Sources officielles consultées : Apple exige Xcode 26+/SDK iOS 26+ depuis le 28 avril 2026 ; Capacitor 8 nécessite Node 22+, Xcode 26+, cible iOS 15+. Audit du passage de Capacitor 7 à 8 avant génération native.
- Aucune publication, appel backend, signature, soumission ou dépense. Prochaine tâche : projet iOS démo reproductible.

## 2026-10-15T13:33:00.670Z — Checkpoint 2 : projet iOS démo
- Checkpoint précédent : cc1565941587ecbf9b70dcf6773a957a5002cef9. Durée écoulée depuis le début de session : 18 minutes.
- Décision motivée par les exigences Apple et les guides Capacitor 8/8.5 : core/cli/ios/android verrouillés à 8.5.3 ; Node >=22 ; aucun projet natif préexistant à migrer. Le générateur actuel fournit le cycle UIScene.
- npm run ios:prepare:demo : génération SPM réussie, puis seconde exécution réussie par sync. Le script reconstruit toujours la démo isolée avant copie, force la cible demo et désactive le mode interactif/télémétrie CLI.
- Source Xcode dans ios-demo/, identifiant local suffixé .demo, appName AppDuSalon Demo, package Swift exact 8.5.3, cible iOS 15. Projet distinct du futur ios/ connecté.
- Contrôles structurels : plist parsé, SceneDelegate présent dans Sources, manifeste de scène cohérent, aucune équipe Apple renseignée ni exception ATS. Ces contrôles ne sont pas une compilation native.
- Ressources binaires réelles du template Capacitor conservées ; icône et splash sont des placeholders explicitement documentés, pas des assets de diffusion validés.
- npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund : succès après mise à jour du lockfile (523 paquets). TypeScript, 136 tests métier et 2 tests de sûreté de build repassés avec succès.
- Les deux cibles Capacitor ont été chargées et contrôlées : ios-demo/dist-mobile-demo pour demo, ios/dist pour la cible connectée. Aucun URL serveur distant.
- WebKit a finalement été téléchargé via le miroir fourni par Playwright ; ses bibliothèques Linux manquent encore. Aucun test navigateur exécuté à ce checkpoint.
- macOS/Xcode absent : compilation, simulateur, signature, TestFlight et revue Apple non réalisés. Pas de publication ni dépense.
- Complément : playwright install-deps webkit a échoué avec setgroups/seteuid Operation not permitted ; aucun contournement des permissions tenté. Recette navigateur différée.

## 2026-10-15T13:48:13.709Z — Checkpoint 3 : marges et clavier mobiles
- Checkpoint précédent : 31f196e66fee9496a044a22ab99e5e386ad14ad9. Durée écoulée observée : 33 minutes.
- Défauts constatés dans les sources : centrage fixe des modales sans tenir compte du clavier, classes text-sm prioritaires sur la taille des champs, onglets tactiles trop courts, absence de marges haut/latérales.
- Adaptation des deux entrées React : suivi VisualViewport avec regroupement par animation frame et nettoyage StrictMode ; zoom manuel préservé. Safe areas sur le cadre, l’en-tête, le menu bas et les modales ; formulaire défilable, champs >=16 px sur tactile ; navigation démo et fermeture à cibles >=44 px. Couleurs métier/pastel inchangées.
- npm run typecheck : succès. Suite via startVitest avec envFile:false : 141 tests dans 20 fichiers, tous passants, dont 5 nouveaux scénarios clavier/fallback/zoom/nettoyage.
- npm run test:mobile:build : 2 tests passants. npm run ios:prepare:demo : build isolée et sync iOS réussies ; JS 553,58 kB, CSS 117,48 kB avant compression. Pas de compilation native.
- npm run test:mobile:browser -- --list : 8 cas reconnus sur 4 profils WebKit. Le serveur de cette recette reconstruit uniquement la démo et ignore les .env ; aucune recette navigateur exécutée, dépendances système toujours indisponibles.
- Revue React : un seul gestionnaire de viewport par racine, événements passifs, nettoyage complet sans état React sur scroll. git diff --check : succès. Aucun comportement visuel certifié sans exécution navigateur/appareil.
- Source technique consultée : https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport (15 octobre 2026) pour la distinction entre viewport visuel/clavier et viewport de mise en page.
- Prochaine tâche : audit session native/reconnexion, puis préparation des contrôles nécessaires ; aucun appel aux données réelles.
