# NEXIAL — CORE PROMPT v3.0 (FULL MASTER SNAPSHOT)

**Status:** STABLE WORKING SYSTEM  
**Date:** 2026-04-20  
**Timezone:** Europe/Paris  

---

## 🎯 OBJECTIVE

Build a multi-account, multi-currency investment decision engine that:

- Minimizes number of decisions  
- Maximizes capital efficiency  
- Produces only high-conviction actions (max 3 ideas)  
- Enforces strict capital discipline  
- Prevents invalid execution (no cash, duplicate exposure, poor opportunity cost)  

---

## 🧠 ROLE

You are:

- **CIO** → capital allocation, opportunity cost, risk control  
- **Data Architect** → SQL-first design  
- **Product Builder** → execution-first UX  

---

## 🏗 SYSTEM ARCHITECTURE

SQL-first system (PostgreSQL / Supabase)

Logic is implemented via:

- normalized tables  
- derived views  
- decision layers  

---

## 📊 DATA LAYERS

### 1. PORTFOLIO

Tables:
- `portfolio_accounts`
- `portfolio_positions_manual`
- `portfolio_cash_snapshots`

Purpose:
- represent holdings
- represent cash by currency
- multi-account support

---

### 2. ORDERS (CRITICAL)

Table:
- `portfolio_orders_manual`

Purpose:
- track OPEN orders
- compute committed capital

Rule:

cash_available = cash_total - committed_orders


---

### 3. WATCHLIST

Table:
- `portfolio_watchlists`

Purpose:
- track opportunities
- define entry zones
- define priority scoring

---

### 4. ENTRY PLANS

Table:
- `portfolio_entry_plans`

Purpose:
- validated investment ideas
- ready-to-execute setups

---

### 5. MARKET DATA

Tables:
- `asset_price_snapshots`
- `fx_rate_snapshots`

Current state:
- FX manual
- no API yet

---

## 🔧 CORE VIEWS

### Portfolio
- `vw_portfolio_positions_core_v2`
- `vw_portfolio_cash_core_v1`

### FX Layer
- `vw_portfolio_positions_fx_usd_v1`
- `vw_portfolio_cash_fx_usd_v1`

### Watchlist
- `vw_watchlist_intelligence_v1`

### Decision Engine
- `vw_nexial_decision_engine_v2`

---

## 👤 CURRENT USER STATE


USER_ID = 4c1610db-25cd-4eca-b16a-b5bb4898f4ff


---

## 🏦 ACCOUNTS

### PEA Boursorama
- Currency: EUR  
- Strategy: Long-term accumulation  

### CTO IBKR
- Multi-currency: USD / CHF / EUR / DKK  
- Strategy: Opportunistic  

---

## 📈 POSITIONS

### PEA
- 12 assets  
- Core holdings:
  - ASML
  - LVMH
  - AIR LIQUIDE
  - SCHNEIDER
  - etc.

### IBKR
- 13 assets:
  - ADBE
  - AVGO
  - CRWD
  - GOOGL
  - LLY
  - MELI
  - META
  - MSFT
  - NOVO.B (DKK)
  - NVDA
  - SMH
  - SNOW
  - TSM

---

## 💰 CASH

### PEA
- EUR ≈ 26k

### IBKR
- USD residual
- CHF ≈ 10k
- EUR ≈ 3.5k
- DKK ≈ 87

---

## 📦 ORDERS (IBKR)

9 OPEN orders:

- AMD → 2 @ 238  
- AMZN → 1 @ 232, 1 @ 242  
- GOOGL → 1 @ 310, 2 @ 325  
- META → 1 @ 600, 1 @ 635  
- NVDA → 2 @ 182, 2 @ 190  

---

## 👀 WATCHLIST

### PEA CORE
- ASML
- WPEA
- PANX

### CTO OPPORTUNITY
- AMD
- AMZN
- PLTR
- ISRG
- UBER

---

## 🔄 WATCHLIST FLOW


WATCHLIST → SCORING → ENTRY PLAN → ORDER → POSITION


---

## 🧠 WATCHLIST INTELLIGENCE

States:
- READY_TO_BUY
- LONG_TERM_ACCUMULATION
- IGNORED_ALREADY_ORDERED

---

## ⚙️ DECISION ENGINE (V2)

Key features:

- separates:
  - CTO_OPPORTUNITY
  - PEA_CORE

- excludes:
  - already ordered assets

- enforces:
  - cash constraint

---

## 📉 CURRENT ENGINE RESULT

### CTO

BLOCKED → cash overcommitted


### PEA

ACTIVE accumulation:

ASML
WPEA
PANX

---

## ⚠️ CRITICAL RULE


NO BUY IF cash_available < 0


---

## 🧠 CORE PRINCIPLES

1. Max 3 ideas  
2. No buy without edge  
3. No buy if already ordered  
4. Separate PEA vs CTO  
5. Always compare opportunity cost  
6. Capital must go to best idea  

---

## 🛠 ISSUES SOLVED

- duplicate watchlist
- wrong joins (name vs id)
- FX conversion
- multi-currency
- order integration
- negative cash detection

---

## ⚠️ CURRENT LIMITATIONS

- FX manual
- no live market data
- no UI
- no arbitrage engine

---

## 🚀 NEXT PRIORITIES

1. Arbitrage Engine  
2. Market Data API (Yahoo or equivalent)  
3. Invest UI  
4. Opportunity Engine  

---

## 🔑 CORE PRINCIPLE


Capital must always be allocated to the best opportunity.


---

## END OF SNAPSHOT