# TASK 013 - Recherche d'asset fuzzy

Execute depuis le fichier source `TASK 013 - Recherche d'asset par te.txt`.

## Resultat

- Ajout d'un composant reutilisable `AssetSearchInput`.
- Recherche declenchee a partir de 2 caracteres.
- Debounce configure a 250 ms via `useAssetSearch`.
- Suggestions avec ticker, nom, exchange, devise et secteur / classe d'actif.
- Selection d'une suggestion via clic avec callback `onSelect(asset)`.
- Integration dans le formulaire d'ajout de position mobile.
- Integration dans le formulaire d'ajout de position desktop.

## Note d'integration

Le composant s'appuie sur l'API existante `/api/assets/search`, qui appelle deja `nx.fn_search_assets_internal` pour les resultats internes et conserve les resultats externes Twelve Data existants.
