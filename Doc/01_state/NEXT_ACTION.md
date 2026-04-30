# NEXIAL — NEXT ACTION

## Action verrouillée

Lancer usage réel PEA + CTO et construire le système de protection premarket / monitoring ordres.

## Objectif immédiat

Utiliser Nexial en conditions réelles tout en sécurisant l’exécution.

---

## Étape 1 — Usage réel

- Suivre portefeuille réel PEA + CTO
- Utiliser /actions et /alerts chaque jour
- Observer :
  - décision claire ?
  - action utile ?
  - confiance utilisateur ?
  - risque d’erreur évité ?

---

## Étape 2 — Monitoring des ordres actifs

Construire une logique qui surveille :

- ordres en cours
- prix limite
- prix actuel
- premarket / overnight move
- écart entre prix limite et nouveau contexte marché

Cas cible :
- META ordre 635
- premarket -10 %
- Nexial alerte :
  - annuler ordre
  - recalculer zone
  - proposer nouveau prix ou WAIT

---

## Étape 3 — Premarket Protection

Avant ouverture US / Europe, Nexial doit détecter :

- gap baissier fort
- gap haussier fort
- ordre devenu non optimal
- actif à surveiller fortement

Sortie attendue :
- alerte claire
- action recommandée
- aucun ordre automatique sans validation

---

## Étape 4 — Universe Scan

Créer une base de 100 à 150 actifs mondiaux à surveiller.

Objectif :
- identifier opportunités hors watchlist
- détecter actifs exceptionnels
- proposer entrée dans watchlist si score supérieur

Catégories :
- Big Tech US
- IA / semi-conducteurs
- software / cybersécurité
- santé / medtech
- Europe qualité
- ETF stratégiques
- émergents / Inde / Asie

---

## Output attendu prochaine session

1. Structure DB pour monitoring ordres
2. Vue `vw_orders_monitoring_v1`
3. Logique premarket alert
4. Structure universe scan 150 actifs
5. Plan d’intégration dans Actions / Alerts / Premarket

## Règle

Ne pas dériver vers des refactors UI.
Priorité : sécurité d’exécution + radar opportunités.