# Démonstration mobile isolée

`npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund`
`npm run test:mobile:build`
`npm run build:mobile:demo`

La sortie est `dist-mobile-demo/index.html`. Cette démo reprend l'agenda et les données synthétiques de PreviewStandalone. Elle ne constitue pas le candidat connecté destiné à l'App Store.

- Entrée propre dans `mobile/` ; aucune police ni ressource distante.
- Le build appelle Vite avec `configFile:false` et `envFile:false` : le .env suivi et les VITE_* héritées du shell ne sont pas chargés.
- Une frontière de modules fait échouer la compilation si App/main, les intégrations ou Supabase sont importés.
- La CSP autorise les scripts locaux, bloque les connexions et soumissions de formulaire ; les interactions React de démonstration restent locales.
- Les artefacts générés ne sont pas suivis par Git. Reconstruire avant la préparation native.
- Ne pas remplacer cette commande par `npm run build` : le build web standard peut charger la configuration backend du salon.
- Les contrôles navigateur, simulateur et iPhone restent distincts de la compilation web.

## Références vérifiées le 15 octobre 2026
- https://developer.apple.com/news/upcoming-requirements/ : Xcode 26+/SDK iOS 26+ pour les envois depuis le 28 avril 2026.
- https://capacitorjs.com/docs/updating/8-0 : Node 22+, Xcode 26+, cible iOS 15+, SPM par défaut pour Capacitor 8.
- Le Vite 5.4.19 installé expose InlineConfig.envFile=false ; les tests de build vérifient le résultat produit.
