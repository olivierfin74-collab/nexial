# NEXIAL — DATA MODEL

## 🎯 OBJECTIF

Modéliser de façon fiable et scalable :

- portefeuille réel
- cash multi-comptes
- prix multi-sources
- opportunités
- décisions
- exécution

---

# 🧱 STRUCTURE GLOBALE

Le modèle est structuré en 4 couches :

1. RAW DATA
2. NORMALISATION
3. CALCUL / DECISION
4. UI READY

---

# 1️⃣ RAW DATA LAYER

## portfolio_positions_manual
Source vérité utilisateur

- id
- account_id
- ticker
- quantity
- avg_cost
- last_price
- currency
- updated_at

👉 jamais modifiée automatiquement

---

## portfolio_accounts

- id
- account_name
- account_type (PEA / CTO / CRYPTO)
- broker_code

---

## portfolio_cash_manual

- account_id
- currency
- cash_amount

---

## market_data_daily

- ticker
- close_price
- price_date

---

# 2️⃣ NORMALISATION LAYER

## vw_latest_real_prices_clean_v1

Objectif :
- consolider prix marché
- nettoyer données externes

Contient :
- ticker
- price
- currency
- is_reliable
- source
- price_timestamp

---

## vw_fx_rates_to_eur_v1

- currency
- rate_to_eur

---

# 3️⃣ CALCUL / DECISION LAYER

## vw_portfolio_positions_ui_v2

👉 SOURCE DE VÉRITÉ PORTFOLIO

Contient :
- ticker
- quantity
- avg_cost
- live_price
- value_native
- value_eur
- pnl_native
- pnl_eur
- pnl_pct
- data_quality
- account_weight_pct
- portfolio_weight_pct

Règle :
SI last_price existe → priorité
SINON → fallback marché

---

## vw_invest_now_output_v4

👉 MOTEUR DE DÉCISION BRUT

Contient :
- buy_ticker
- sell_ticker
- target_amount
- buy_zone_low
- buy_zone_high
- alpha_score
- fx_score
- net_score
- decision_bucket

⚠️ NE JAMAIS UTILISER EN UI

---

## vw_invest_ui_v1

👉 SOURCE UI INVEST

Contient :
- ticker
- asset_name
- latest_close_price
- suggested_quantity
- amount_suggested
- buy_zone
- score
- capital_efficiency_score
- expected_return_pct
- decision
- price_quality
- price_source

👉 agrège :
- décision (v4)
- prix (portfolio)
- règles UX

---

## vw_patrimoine_total_general_eur_v1

👉 consolidation globale

- total_positions_eur
- total_cash_eur
- total_general_eur

---

# 4️⃣ UI LAYER (READ ONLY)

Toutes les pages utilisent UNIQUEMENT :

| Page | Source |
|------|--------|
| Dashboard | vw_invest_ui_v1 |
| Actions | vw_invest_ui_v1 |
| Portefeuille | vw_portfolio_positions_ui_v2 |
| Allocation | vw_allocation_* |
| Patrimoine | vw_patrimoine_* |

---

# ⚠️ RÈGLES CRITIQUES

## 1. SINGLE SOURCE OF TRUTH

- portefeuille → vw_portfolio_positions_ui_v2
- invest → vw_invest_ui_v1

---

## 2. PRIX

SI actif en portefeuille → utiliser prix portefeuille  
SINON → utiliser prix marché  

SI data_quality != OK → bloquer décision

---

## 3. INTERDICTIONS

❌ utiliser directement :
- vw_invest_now_output_v4
- market_data_daily
- raw tables en UI

❌ fallback automatique entre vues

---

## 4. CALCUL

Tous les calculs critiques doivent être :
👉 faits en SQL  
👉 jamais en frontend

---

## 5. TRAÇABILITÉ

Chaque vue doit contenir :
- source prix
- qualité data
- timestamp

---

# 🎯 OBJECTIF FINAL

- cohérence totale
- zéro duplication
- décisions fiables
- debug facile
- scalabilité