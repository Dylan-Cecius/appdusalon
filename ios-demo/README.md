# AppDuSalon — projet iOS de démonstration

Projet généré avec Capacitor 8.5.3 (SPM, cycle UIScene), conservé comme source.
Il utilise exclusivement la démonstration à données fictives.

```sh
npm ci --ignore-scripts --legacy-peer-deps --no-audit --no-fund
npm run ios:prepare:demo
```

La préparation reconstruit la démo puis ajoute le projet s'il est absent, ou
synchronise les ressources s'il existe déjà. Elle ne compile, ne signe et
n'envoie rien à Apple. Les bundles JS et la configuration copiée ne sont pas
versionnés ; ne pas ouvrir une copie fraîche dans Xcode avant cette étape.

Sur un Mac équipé de Xcode 26 ou plus récent, ouvrir `ios-demo/App/App.xcodeproj`.
La cible minimale est iOS 15. Le package Swift Capacitor est verrouillé à 8.5.3.
La résolution de ce package et la compilation native n'ont pas été exécutées
dans l'environnement Linux de préparation.

L'identifiant se termine par `.demo` et le nom affiché est `AppDuSalon Demo`.
Ils servent au développement local ; aucun enregistrement Apple ni aucune
équipe de signature n'est confirmé. Le projet ne doit pas être soumis au store.

Les icônes et splash screens sont les ressources par défaut du générateur
Capacitor. Ce sont des placeholders à remplacer par les assets validés du
produit avant de préparer une diffusion. La confidentialité, les liens natifs,
la reprise de session et la recette sur appareil restent à valider.
