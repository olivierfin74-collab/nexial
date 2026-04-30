# NEXIAL_CURRENT_STATE

Last update: 2026-04-27

## Phase
Capital Redeployment Engine

## Step
create `capital_redeployment_v2`

## System status
- Cloud automation OK
- Market data OK (Twelve Data stable)
- PEA portfolio loaded
- CTO portfolio loaded
- Watchlist CTO OK
- entry_zones_live_v2 OK
- position_sizing_v2 OK
- execution_order_lines_v2 OK
- execution_order_alerts_v1 OK

## Market state
- All assets above Z1
- No active trades
- WAIT = correct behavior

## Product rules (locked)
- No sell at loss (unless thesis broken)
- Use cash first
- Sell winners only
- Reduce weak only near break-even (~ -3%)
- Always frame as optimization

## Do NOT redo
- pricing
- watchlist
- positions
- sizing
- execution

## Next
build `capital_redeployment_v2`

## Restart protocol
User says: on reprend Nexial

Assistant must:
- confirm phase
- confirm step
- say "No drift detected"
- execute ONLY redeployment

## Session update — LIVE PRICES ENABLED

### Completed
- Twelve Data API connected
- Next.js API route working
- market_data_intraday populated
- price_engine_live_v1 ready
- CTO live prices validated (NVDA, AVGO, META, MSFT, GOOGL, AMZN, TSM)

### Current state
- Live data pipeline operational
- PEA data still unreliable (mapping / source issue)
- execution_orders_v4 pending integration with live price engine

### Next
- Integrate price_engine_live_v1 into execution_orders_v4
- Rebuild opportunistic_execution_v3 with live data
- Validate full decision engine in real-time

### Status
SYSTEM READY FOR LIVE DATA EXECUTION

## Session update — LIVE EXECUTION PIPELINE VALIDATED

### Completed
- Twelve Data API connected and validated
- Next.js API route operational (`/api/update-intraday-prices`)
- market_data_intraday table populated with live data
- price_engine_live_v1 using real-time prices
- execution_orders_v4 integrated with live pricing
- opportunistic_execution_v3 validated with real-time decision logic
- execution_orders_ready_v1 generating structured orders (Z1/Z2/Z3)
- execution_orders_actionable_v1 filtering real execution opportunities
- execution_orders_ibkr_v1 generating broker-ready orders

### Data validation
- CTO US prices confirmed accurate (NVDA, AVGO, META, MSFT, GOOGL, AMZN, TSM)
- Live feed priority correctly applied (price_source = LIVE_PRICE)
- Data freshness logic operational

### Current behavior
- Market phase: OPEN_PLUS_30_CONFIRMATION
- All tracked assets above Z1 entry levels
- No valid execution trigger (correct behavior)
- No actionable orders generated (expected)

### Interpretation
- Market is extended (no pullback)
- System correctly avoids overpaying
- Decision engine respects strict entry discipline
- Capital preserved → optimal state

### Status
SYSTEM READY FOR LIVE EXECUTION  
NO TRADE CONDITION CONFIRMED (PRICE ABOVE BUY ZONES)

### Next
- Monitor pullback events triggering Z1/Z2/Z3
- Validate first real execution scenario
- Optional: integrate IBKR API for automated order sending
- Improve PEA data quality (currently unreliable vs CTO)

### Key principle
NO EDGE → NO TRADE

## Session update — PRODUCT + LIVE PIPELINE STABILIZED

### Completed
- Live prices (Twelve Data) integrated
- market_data_intraday populated
- price_engine_live_v1 validated
- execution_orders_v4 using live data
- opportunistic_execution_v3 stable
- execution_orders_ready_v1 (Z1/Z2/Z3) working
- execution_orders_actionable_v1 filtering valid trades
- execution_orders_ibkr_v1 ready (manual execution)
- telegram_alerts_live_v1 working
- tracking_performance_v1 implemented

### Current behavior
- Market = OPEN / CLOSED handled correctly
- All assets above Z1 → WAIT (correct)
- No actionable trades → expected
- System disciplined → no overtrading

### Issues identified
- PEA prices unreliable (WPEA, EU assets)
- Portfolio not fully synced
- Allocation view incomplete
- Invest UI too technical / not attractive

### Strategic decision
- No automation yet
- Manual execution phase (beta testing)
- Focus on reliability + UX

### Next priorities
1. Account filtering (PEA / CTO)
2. Fix PEA price engine
3. Sync full portfolios
4. Build allocation_live_v1
5. UX/UI redesign (premium experience)

### Status
SYSTEM FUNCTIONAL — READY FOR BETA TESTING (MANUAL MODE)

END