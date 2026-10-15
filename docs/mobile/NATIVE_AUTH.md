# Authentification native préparée

## Contrat de callback — 15 octobre 2026

La destination est une adresse de retour canonique configurée explicitement. Aucune valeur par défaut ni identité Apple n’est créée. Les exemples `com.example.appdusalon.test://auth/callback` et `https://example.invalid/auth/callback` sont exclusivement synthétiques.

Le parseur accepte un unique code PKCE ou une erreur fournisseur réduite à un résultat générique. Il refuse les jetons d’accès/rafraîchissement dans les URL, les fragments, les paramètres ambigus et toute destination différente. Le type recovery ne provient jamais d’un paramètre entrant : seul le résultat de l’échange avec vérificateur local peut le demander.

Le contrôleur sérialise les échanges, ignore les doublons démarrage/événement et borne la file à quatre demandes et le cache à 32 codes en mémoire. Les codes ne sont ni persistés ni journalisés. Après une erreur, demander un nouveau lien ; pas de rejeu automatique. Le démontage supprime les callbacks UI et le travail en attente ; il ne peut pas annuler un échange SDK déjà parti.

42 tests synthétiques contrôlent ces règles. Aucun compte réel ni appel réseau n’est nécessaire. À ce checkpoint, ce module n’est pas encore relié au plugin App.

## Sources consultées
- https://capacitorjs.com/docs/apis/app : événements d’URL et lecture de l’URL de démarrage.
- https://supabase.com/docs/guides/auth/sessions/pkce-flow : vérificateur local et initiation/retour sur le même appareil. Les options expérimentales multi-flux récentes ne sont pas utilisées avec auth-js 2.71.1.
- https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession : échange du code, distinct de l’installation de jetons reçus par URL.

## Raccordement sous configuration explicite
Le pont connecté nécessite iOS, `VITE_NATIVE_AUTH_ENABLED=true` et `VITE_NATIVE_AUTH_REDIRECT_URL` valide. Aucun de ces paramètres n’est fourni par la démo. App 8.1.2 est verrouillé ; le projet démo l’exclut avec includePlugins=[] et sa frontière de build interdit src/native.

Le pont écoute avant de lire getLaunchUrl, donne priorité à un callback récent et retire les écouteurs après un démontage, même si leur inscription était encore en attente. 51 cas ciblés passent (contrat, configuration, raccordement synthétique). La page Auth suit le Router pour afficher la récupération après échange ; les vérifications précédentes sont invalidées.

Le client iOS utilise PKCE et n’installe pas de session à partir d’une URL détectée automatiquement. Les retours d’inscription/récupération exigent une destination configurée ; OAuth natif reste indisponible tant que le parcours de navigateur système n’est pas implémenté. Le web conserve son comportement.

Limites de ce checkpoint : reprise de rafraîchissement à raccorder, garde de flux local et rejeu après rechargement à traiter, stockage Keychain absent, aucune destination Apple/backend enregistrée. La compilation isolée des sources connectées ne valide pas ces parcours sur appareil.
