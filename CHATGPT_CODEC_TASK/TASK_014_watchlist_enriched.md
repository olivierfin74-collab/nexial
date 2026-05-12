# TASK 014 - Watchlist enrichie live

Execute depuis les fichiers sources `TASK 014 - Watchlist enrichie avec.txt` et `TASK 014 - Watchlist enrichedFichie.txt`.

## Resultat

- Utilisation du payload enrichi existant via `/api/watchlists/[id]/items`, qui appelle `fn_get_watchlist_payload_for_user`.
- Tri des items par `opportunity_score` decroissant.
- Mobile: lignes/cartes enrichies avec prix, perf 24h, score, distance Z1, tags RSI et BUY ZONE.
- Desktop: table/cartes enrichies avec prix, perf 1d, score, distance Z1, tags RSI et BUY ZONE.
- Fond vert clair quand le prix est en zone d'achat.
- Click item vers la page detail asset conserve.
- Retrait de watchlist conserve via `fn_remove_from_watchlist`.

## Note d'integration

Le desktop ajoute une mini sparkline 30 jours approximative a partir du prix courant et de la perf 1j pour rester compatible avec les donnees deja exposees par le payload actuel.
