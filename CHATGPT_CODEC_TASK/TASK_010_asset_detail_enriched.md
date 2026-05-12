# TASK 010 - Page detail asset enrichie

Source initiale: `# TASK 010 - Page detail asset enri.txt`.

## Objectif

Enrichir la page detail asset avec:
- donnees techniques
- zones Z1/Z2/Z3
- position utilisateur si detenue
- alertes actives
- historique transactions

## Notes

L'API actuelle `/api/asset/[ticker]` expose les donnees agregees disponibles via `fn_get_asset_detail_for_user`.
Les sections alertes/historique affichent des etats vides propres si les lignes dediees ne sont pas encore exposees.

## Validation

`npm run build` doit passer.
