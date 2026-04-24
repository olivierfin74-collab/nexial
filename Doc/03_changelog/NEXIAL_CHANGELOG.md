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
