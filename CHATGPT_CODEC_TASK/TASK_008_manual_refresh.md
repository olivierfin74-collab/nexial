# TASK 008 - Bouton "Rafraichir" sur dashboard

Source initiale: `TASK 008 - Refresh manuel des donne.txt`.

## Objectif

Ajouter un bouton de refresh manuel sur les pages principales sans recharger toute la page.

## Pages concernees

- Dashboard / Tableau
- Aujourd'hui
- Portefeuille
- Watchlist

## Criteres

- Bouton `RefreshCw` visible sur mobile et desktop.
- Click appelle le `refetch` du hook quand il existe.
- Animation rotate pendant le refresh.
- Bouton desactive pendant le refresh.
- Delai minimal de 500 ms pour rendre l'etat visible.
- `npm run build` OK.
