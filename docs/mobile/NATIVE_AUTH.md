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
