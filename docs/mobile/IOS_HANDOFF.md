# Reprise AppDuSalon V2 iOS — 15 octobre 2026

Source initiale : Dylan-Cecius/appdusalon, checkpoint web 8a6933c853544e6629bad6d0d62e1097213adaf8.
Branche de travail : v2/ios-appstore. Agent indépendant de l'agent V2 web et de Nous Deux.

## État observé
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
