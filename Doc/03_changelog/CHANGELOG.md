# CHANGELOG NEXIAL

> Journal des évolutions produit, data et UX.
> Format : clair, actionnable, sans bruit.
> Objectif : comprendre rapidement ce qui a changé et pourquoi.

---

## [2026-04-28] — Stabilisation Invest + refonte UX

### 🚀 Features

- Création de `vw_invest_ui_v1`
  - source unique pour UI Invest / Dashboard / Actions
  - intégration prix portefeuille prioritaire
  - suppression des fallback implicites

- Implémentation de la logique :
  - SI actif en portefeuille → prix portefeuille
  - SINON → prix marché
  - SI data_quality ≠ OK → blocage décision (SURVEILLANCE)

- Refonte des pages :
  - Dashboard → décision globale
  - Invest → future page Actions (exécution)
  - séparation claire Marché vs Actions

---

### 🧠 Améliorations produit

- Passage d’un outil d’analyse à un moteur de décision
- Limitation des opportunités à un Top 3
- Introduction de la logique :
  - WAIT si aucune opportunité forte
  - suppression des signaux faibles

- Clarification UX :
  - Opportunités → Marché
  - Investir → Actions

---

### 🔧 Corrections critiques

- Fix bug prix WPEA :
  - affichage 6 → corrigé en 6.40
  - origine : vue incorrecte utilisée côté UI

- Suppression des VIEW_CANDIDATES
  - évite fallback vers anciennes vues
  - garantit cohérence globale

- Alignement complet :
  - Portfolio ↔ Invest ↔ Dashboard

---

### 🧱 Architecture

- Ajout de couches claires :

```text
DATA → DECISION → UI

---
## 2026-04-29 — Passage en système complet Nexial (Radar → Alerts → Execution)

### 🚀 Features

- Création des vues intraday :
  - `vw_intraday_scan_v1`
  - `vw_intraday_opportunities_v1`

- Implémentation du système Alerts :
  - `market_alerts_live_v1`
  - `vw_alerts_live_ui_v1`
  - déduplication automatique par ticker
  - priorisation des signaux

- Création du module Entry Plans :
  - `vw_entry_plans_v1`
  - calcul automatique :
    - prix limite
    - montant
    - quantité
  - séparation PREPARE / READY / WATCH

- Refonte complète de la page Actions :
  - suppression des faux signaux (MSFT)
  - suppression des doublons
  - affichage uniquement opportunités réelles
  - intégration discipline NO ACTION

- Création des pages :
  - `/premarket` → radar marché
  - `/alerts` → signaux live
  - `/entry-plans` → ordres préparés
  - `/actions` → exécution

---

### 🧠 Améliorations produit

- Introduction du pipeline complet :

```text
Premarket → Alerts → Entry Plans → Actions

## [2026-04-30] — UX Premium + Scoring

### Features
- Implémentation Score Nexial
- Top 3 opportunités
- Bloc "À surveiller — proches opportunités"
- Filtrage data qualité (price + stale)

### UX
- Mode WAIT optimisé
- Suppression cartes inutiles
- Affichage clair des priorités

### Product
- Passage d’outil → moteur de décision
- Introduction logique premium UX

## [2026-04-30] — Premium Product Direction / Order Monitoring / Universe Scan

### Product
- Clarification objectif : logiciel premium irrésistible
- Positionnement : accessible débutants, puissant experts
- Validation importance onboarding progressif
- Préparation usage réel PEA + CTO
- Préparation beta testeurs rapides

### Execution Safety
- Ajout priorité monitoring ordres actifs
- Ajout logique premarket / overnight protection
- Cas critique identifié : META ordre 635 avec gap premarket -10 %
- Objectif : alerter avant ouverture pour annuler, modifier ou attendre

### Opportunity Engine
- Ajout priorité universe scan 100–150 actifs mondiaux
- Séparation watchlist principale vs univers élargi
- Objectif : détecter opportunités exceptionnelles hors watchlist

### Next
- Construire monitoring ordres
- Construire vue premarket alert
- Définir univers 150 actifs
- Intégrer signaux dans Actions / Alerts / Premarket