# TASK 009 - Indicateur statut marches US/EU

Source initiale: section `TASK 009` incluse dans `TASK 008 - Refresh manuel des donne.txt`.

## Objectif

Afficher d'un coup d'oeil si les marches EU et US sont ouverts, en pre-market, after-hours ou fermes.

## Criteres

- Composant `MarketStatusIndicator`.
- EU + US avec code couleur:
  - vert: ouvert
  - ambre: pre-market ou after-hours
  - gris: ferme
- Mise a jour automatique toutes les minutes.
- Present sur mobile dans le header Dashboard.
- Present sur desktop dans la top nav.
- `npm run build` OK.
