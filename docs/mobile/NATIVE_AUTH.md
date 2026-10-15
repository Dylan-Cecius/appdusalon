# Authentification native préparée

## Contrat de callback — 15 octobre 2026

La destination est une adresse de retour canonique configurée explicitement. Aucune valeur par défaut ni identité Apple n’est créée. Les exemples `com.example.appdusalon.test://auth/callback` et `https://example.invalid/auth/callback` sont exclusivement synthétiques.

Le parseur exige une corrélation flow locale et un unique code PKCE, ou une erreur fournisseur réduite à un résultat générique. Il refuse les jetons d’accès/rafraîchissement dans les URL, les fragments de session, les paramètres ambigus et toute destination différente. Le type recovery ne provient jamais d’un paramètre entrant : la demande locale détermine le parcours après un échange PKCE réussi. Aucun champ privé du SDK n’est requis.

Le contrôleur sérialise les échanges, ignore les doublons démarrage/événement et borne la file à quatre demandes et le cache à 32 codes en mémoire. Les codes ne sont ni persistés ni journalisés. Après une erreur, demander un nouveau lien ; pas de rejeu automatique. Le démontage supprime les callbacks UI et le travail en attente ; il ne peut pas annuler un échange SDK déjà parti.

Le parseur et le contrôleur sont raccordés au pont App sous opt-in. Les tests utilisent exclusivement des fixtures synthétiques.

## Sources consultées
- https://capacitorjs.com/docs/apis/app : événements d’URL et lecture de l’URL de démarrage.
- https://supabase.com/docs/guides/auth/sessions/pkce-flow : vérificateur local et initiation/retour sur le même appareil. Les options expérimentales multi-flux récentes ne sont pas utilisées avec auth-js 2.71.1.
- https://supabase.com/docs/reference/javascript/auth-exchangecodeforsession : échange du code, distinct de l’installation de jetons reçus par URL.

## Raccordement sous configuration explicite
Le pont connecté nécessite iOS, `VITE_NATIVE_AUTH_ENABLED=true` et `VITE_NATIVE_AUTH_REDIRECT_URL` valide. Aucun de ces paramètres n’est fourni par la démo. App 8.1.2 est verrouillé ; le projet démo l’exclut avec includePlugins=[] et sa frontière de build interdit src/native.

Le pont écoute avant de lire getLaunchUrl, donne priorité à un callback récent et retire les écouteurs après un démontage, même si leur inscription était encore en attente. 51 cas ciblés passent (contrat, configuration, raccordement synthétique). La page Auth suit le Router pour afficher la récupération après échange ; les vérifications précédentes sont invalidées.

Le client iOS utilise PKCE et n’installe pas de session à partir d’une URL détectée automatiquement. Les retours d’inscription/récupération exigent une destination configurée ; OAuth natif reste indisponible tant que le parcours de navigateur système n’est pas implémenté. Le web conserve son comportement.

Limites : stockage Keychain absent, aucune destination Apple/backend enregistrée, recette réelle des liens et de la reprise non exécutée. La compilation isolée des sources connectées ne valide pas ces parcours sur appareil.

## Reprise de session préparée
Le pont appStateChange prend la main après initialize et l’arrêt du gestionnaire automatique navigateur. Les démarrages/arrêts sont sérialisés, un état initial tardif ne remplace pas un événement plus récent et le dernier arrêt d’un composant précède le démarrage de son remplaçant. Une prise de contrôle échouée ne démarre pas de second rafraîchissement.

Douze tests synthétiques couvrent ces transitions et la propriété lors d’un remontage. La réception effective d’appStateChange avec le projet UIScene reste à vérifier sur iOS ; cette préparation ne constitue pas une validation du mode arrière-plan natif. Le stockage des jetons reste celui décrit dans SESSION_AUDIT.md.

## Corrélation locale et rejeu
La demande d’inscription ou de récupération crée 128 bits aléatoires via crypto.getRandomValues et ajoute `?flow=<identifiant>` à l’adresse de retour. Seuls cet identifiant, le but et la date sont conservés dans localStorage ; aucun e-mail, code ou jeton supplémentaire. Le vérificateur PKCE reste géré par le SDK. Une seule demande est active, valide pendant au plus une heure.

Le retour exige cet identifiant exact, consomme le marqueur avant l’échange et refuse la répétition même après remontage/rechargement. Une demande plus récente remplace l’ancienne ; un échec tardif ne peut pas l’annuler. Stockage inaccessible, écriture ou suppression non confirmée : aucun échange. Une interruption/erreur après consommation impose un nouveau lien.

101 tests natifs synthétiques sont passants à ce checkpoint, dont 18 sur la corrélation et l’initiation. Le parcours natif reste opt-in et sans configuration réelle. La future recette backend isolée devra démontrer que les URL autorisées et modèles d’e-mail conservent flow ; aucune liste de redirections ni aucun modèle hébergé n’a été modifié. Source relue le 15 octobre 2026 : https://supabase.com/docs/guides/auth/redirect-urls. Les erreurs fournisseur en fragment sont acceptées seulement si la query contient le seul identifiant flow local et le fragment contient exclusivement error/error_code/error_description sans doublon. Le message reste générique ; aucun champ entrant n’est affiché. Tout mélange avec code ou jeton est refusé.

## Recette native restante (aucun cas exécuté sur iOS)
- Initier une demande synthétique sur le même appareil ; confirmer que le backend isolé et son modèle conservent flow, puis vérifier le formulaire après échange PKCE.
- Retour à froid puis événement doublon : un seul échange ; redémarrage ultérieur : aucun rejeu. Ancien lien après nouvelle demande : nouvelle demande conservée.
- Erreur fournisseur en query/fragment : message générique, aucun échange, nouvelle demande nécessaire. Lien expiré/mauvaise destination/jeton : aucun échange.
- Passer en arrière-plan pendant un renouvellement, revenir, remonter la racine : pas de double propriétaire ; vérifier UIScene et réseau sur appareil.
- Coupure réseau, jeton expiré/révoqué, stockage indisponible, MFA et déconnexion : aucun succès affiché sans preuve SDK ; nouvelle demande nécessaire après échange interrompu.
- Un schéma enregistré, l’allowlist backend, le stockage natif adapté et la compilation/signature restent des prérequis distincts ; les fixtures ne les établissent pas.
