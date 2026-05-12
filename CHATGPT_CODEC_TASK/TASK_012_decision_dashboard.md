# TASK 012 - Dashboard de decisions du jour

Execute depuis le fichier source `TASK 012 - Dashboard de decisions d.txt`.

## Resultat

- Ajout d'une section `Decisions du jour` dans la page Aujourd'hui.
- Mobile: affichage vertical des 4 cartes.
- Desktop: affichage en grille 2x2.
- Cartes ajoutees:
  - Regime marche via `fn_get_latest_market_regime`
  - Opportunites chaudes via `investment_alerts`
  - Positions a risque via `investment_alerts`
  - Patrimoine via le dashboard patrimoine existant
- Les cartes redirigent vers les vues detaillees existantes: Tableau, Aujourd'hui ou Portefeuille.
- Les lignes d'alertes ouvrent le detail asset.

## Note d'integration

Les alertes et le regime utilisent les RPC/tables prevus avec fallback sur les mocks existants si la donnee live n'est pas disponible cote client.
