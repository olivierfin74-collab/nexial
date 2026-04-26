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

END