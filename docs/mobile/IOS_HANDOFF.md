# Reprise AppDuSalon V2 iOS — 15 octobre 2026

Source initiale : Dylan-Cecius/appdusalon, checkpoint web 8a6933c853544e6629bad6d0d62e1097213adaf8.
Branche de travail : v2/ios-appstore. Agent indépendant de l'agent V2 web et de Nous Deux.

## État initial observé
- package.json déclare React 18.3.1, Vite 5.4.19, TypeScript 5.8.3 et Capacitor Android/CLI/Core/iOS ^7.4.3 ; vérifier le lockfile avant installation et les exigences SDK actuelles avant compilation.
- capacitor.config.ts héritait appId app.lovable.bc4f1f063375468ea2e9bd0862a8c643, appName coiff-cash-pro et une URL de live reload Lovable avec cleartext activé.
- Aucun dossier ios/ ni projet Xcode dans l'arbre Git inspecté. Une ancienne configuration existe, pas une application native terminée.
- Le premier correctif enlève le serveur distant et cleartext, garde webDir dist et utilise le nom AppDuSalon V2. L'appId reste provisoire ; ne pas l'enregistrer ni prétendre qu'il appartient à l'équipe Apple.
- Le projet web contient de nombreuses fonctions et tests utiles. Voir V2_RELEASE_STATUS.md pour les preuves historiques du checkpoint web ; elles ne sont pas une validation iOS.
- La configuration Supabase utilise des variables Vite. Ne pas charger le .env suivi pour les essais. Fixer des variables isolées/démo explicites.

## Décision
Reprendre la V2 avec Capacitor minimise la duplication des règles métier et permet des corrections partagées. Réévaluer uniquement sur preuves d'une limite concrète. L'application doit apporter une ergonomie et des parcours mobiles réellement aboutis ; aucune acceptation App Store n'est garantie par le choix technique.

## Sources techniques consultées
- https://capacitorjs.com/docs/config : server.url et cleartext servent au live reload, pas à la configuration de production.
- https://developer.apple.com/app-store/review/guidelines/ : relire les règles applicables avant le dossier de soumission.
- https://learn.chatgpt.com/docs/automations : une tâche web reprend depuis le prompt et les services connectés ; elle ne conserve pas un dossier local entre les exécutions.

La documentation et les APIs étant évolutives, vérifier leur version au moment d'utiliser une commande. Ne pas télécharger/lancer une version latest sans décision motivée.

## Reprise
Lire les fichiers AUTONOMY-* de cette branche, prendre le bail, traiter le premier élément prêt du backlog, vérifier puis sauvegarder avec expected_sha. N'écrire sur aucune autre branche. Ne pas republier l'aperçu Sites web au nom de l'agent iOS.

## État de reprise après le premier cycle de développement
- Capacitor est maintenant verrouillé à 8.5.3 et Node >=22. Projet démo SPM/UIScene dans ios-demo/, cible iOS 15. Aucune compilation/signature iOS réalisée.
- Commencer par les preuves les plus récentes de AUTONOMY-LOG.md et IOS_RELEASE_STATUS.md, qui prévalent sur l’inventaire initial ci-dessus.
- MOBILE_DEMO.md décrit les builds isolées et commandes de tests ; SESSION_AUDIT.md décrit les corrections de session et les manques natifs. Ne pas lancer le build web par défaut ni charger le .env suivi pour les essais.
- La recette WebKit est préparée mais non exécutée, bibliothèques Linux indisponibles ; ne pas convertir --list en preuve de réussite.

## Reprise après les lots du 2026-10-15T14:59:02Z
- Pont App 8.1.2, liens PKCE corrélés et cycle de session préparés sous opt-in explicite ; aucune configuration Apple/backend réelle. Voir NATIVE_AUTH.md et SESSION_AUDIT.md.
- Dernière suite observée : 253 tests/28 fichiers passants ; recette navigateur étendue à 20 cas découverts, toujours non exécutés. Aucun binaire iOS compilé/signé.
- Les commandes agenda et panneaux latéraux ont reçu des adaptations tactiles/safe areas/clavier. Les preuves unitaires et de build ne valident pas leur rendu sur iPhone.

Dernier code récupéré à la clôture 2026-10-15T15:03:54Z : 2078b4178d9618b9513e8e60a79f4c2f7410ed5d. Huit lots du cycle consignés dans le journal, bail libéré. Après la suite de 253 tests, le contrôle ciblé de flux compte 20 tests passants avec les deux derniers ajouts. Reprendre la priorité métier mobile décrite dans le backlog ; ne pas reconstruire le projet depuis zéro.

## Reprise actualisée 2026-10-15T16:04:04Z
Dix lots fonctionnels du cycle 4, dernier 4e699530c8efd8344f3a6c621f8f54970f38dda6 : caisse confirmée et suivis indépendants, édition client conservée sur échec, flux partagés bornés à la session/salon, statistiques indisponibles explicites, panier tactile avec sélection persistante, export CSV échappé. Voir SHA et commandes dans AUTONOMY-LOG.md.
Dernière suite complète exécutée : 293 tests/33 fichiers ; ensuite 18 tests CSV ciblés passants. Dernier TypeScript et build connecté isolé : passants (3616 modules). Deux tests de sûreté démo et build/sync ios-demo passants ; aucune compilation Xcode. 32 cas navigateur découverts, aucun exécuté. Démo panier synthétique : `?mobile-cart=1`, erreur simulée : `?mobile-cart=1&failure=1` ; aucune donnée réelle.
Commandes sûres : `npm run typecheck`, `npm run test:mobile:unit`, `npm run test:mobile:build`, `npm run build:mobile:check-connected`, `npm run ios:prepare:demo`. Ne pas substituer les commandes par défaut chargeant .env. Priorité suivante : parcours agenda mobile, confirmation de mutation et conservation des saisies ; stockage natif, export natif, recettes UI/iPhone et dossier Apple restent ouverts. AppId/équipe/signature toujours non vérifiés, pas de TestFlight.

Clôture 2026-10-15T16:04:45Z (50 min 10 s) : code/audit 684d082cd2bca990f6138d3aab4c4d9af5efd845, bail libre. Relire les six fichiers de pilotage et la référence actuelle avant toute écriture ; prochaine priorité agenda dans le backlog.
