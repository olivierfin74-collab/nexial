# NEXIAL_CHANGELOG

## 2026-04-24
- Twelve Data market data pipeline validated
- `update-market-data` deployed and working
- `market_data_daily` write path fixed
- Decision Engine V1 created:
  - `asset_scoring_v1`
  - `asset_scoring_v2`
  - `opportunity_ranking_v1`
  - `decision_output_v1`
- Invest flow created:
  - `allocation_v1`
  - `invest_now_input`
  - `invest_now_v1`
  - `invest_recommendation_v1`
  - `timing_engine_v1`
- Portfolio layer created:
  - `portfolio_positions`
  - `portfolio_status_v1`
  - `portfolio_arbitrage_v1`
  - `position_sizing_v1`
  - `portfolio_decision_output_v1`
- FX / budget / optimization created:
  - `fx_rates`
  - `fx_latest`
  - `execution_orders_fx_v1`
  - `budget_execution_v1`
  - `capital_optimization_v1`
- Order system created:
  - `final_order_pack_v1`
  - `order_tracking_v1`
  - `order_status_engine_v1`
- Telegram alerting validated with bot `nexial_invest_alerts_bot`
- Cron jobs configured:
  - `refresh-market-data`
  - `check-order-status`
- Active next step: anti-spam alert lifecycle

---

## 2026-04-24T15:36:07.137Z

## Session update — 2026-04-24
Completed:
-

Next:
-

Blockers:
-

---

## 2026-04-24T15:47:23.044Z

## Session update — 2026-04-24

Completed:
- Full MVP validated
- Telegram alerts working
- Cron automation active

Next:
- Implement alert anti-spam

Blockers:
- None

---

## 2026-04-24T22:26:58.669Z

# Session Update — 2026-04-25

## Contexte
Objectif : passer de moteur technique à produit utilisable (Invest Now)

---

## Frontend

- Mise en place Next.js app
- Création écran Nexial Invest Now
- UX simplifiée (1 décision = 1 action)
- Bouton J’ACHÈTE opérationnel
- Ajout Historique + Performance
- Correction layout (affichage multi-blocs)

---

## Backend (Supabase)

- Connexion Supabase frontend OK
- Intégration vw_invest_now_engine_v1
- Création insertion execution_queue_v1 depuis UI
- Implémentation anti-spam (UI + DB)
- Ajout champ mode (INVEST_NOW vs EXPERT)

---

## Data

- Historique isolé via vw_invest_now_history_v1
- Performance isolée via vw_invest_now_performance_v1
- Correction cohérence UI ↔ DB (bug quantité fixé)

---

## DevOps

- Git installé et configuré
- Premier commit projet réalisé
- Structure Doc Nexial utilisée (state / changelog / archive)

---

## Résultat

- App fonctionnelle (localhost)
- Flux complet validé :
  décision → affichage → action → ordre → tracking

---

## Limites actuelles

- Watchlists non segmentées (PEA / CTO)
- Mode expert non implémenté
- Allocation globale non optimisée
- Pas de logique d’arbitrage
- Pas de gestion multi-actifs

---

## Prochaine étape

- Création watchlists Olivier (PEA / CTO)
- Construction Strategy Engine (top 3 opportunités)
- Routing capital intelligent (PEA vs CTO)

---

## Insight clé

- Invest Now validé pour profil débutant
- Produit utilisable immédiatement
- Base solide pour stratégie avancée

---
