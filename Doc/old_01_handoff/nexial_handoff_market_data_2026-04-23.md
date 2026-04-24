# NEXIAL — HANDOFF SNAPSHOT (MARKET DATA PIPELINE)

## STATUS
Phase: Data ingestion validation  
Function: update-market-data  
State: BLOCKED — DB WRITE FAILING

---

## SYSTEM STATE (CONFIRMED)

### Infrastructure
- Supabase project initialized
- Edge Function deployed and callable
- Secrets configured

### Data Source
- Provider: Twelve Data (active)
- Alpha Vantage: abandoned
- Yahoo Finance: abandoned

### Data Fetch
- assets_v1 readable
- Fetch loop working
- API returning valid prices

---

## VALIDATED DATA

- AAPL → OK
- MSFT → OK
- ASML → OK
- MC → price returned but incorrect mapping (to fix later)
- PANX → unavailable on plan (ignored)

---

## CURRENT BLOCKER (CRITICAL)

Upsert into `market_data_daily` is failing.

### Symptoms
- price returned
- status = "error"
- no data persisted

---

## ROOT CAUSE (PRIORITIZED)

1. Missing UNIQUE constraint (asset_id, price_date)
2. Schema mismatch in `market_data_daily`
3. Deployed function not matching latest code (db_error missing)

---

## HARD STOP RULE

DO NOT proceed to:
- scoring engine
- dashboard
- opportunity selection
- allocation logic

UNTIL:
```json
status = "updated"