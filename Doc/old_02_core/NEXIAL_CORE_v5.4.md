# NEXIAL — MASTER SNAPSHOT v5.4 FULL (INDUSTRIAL EXECUTION / PERFORMANCE MAX / NO INFORMATION LOSS)

**Status:** ACTIVE MASTER FILE  
**Purpose:** preserve the full prior master snapshot **without deleting information**, while updating the execution state after successful implementation of the market data pipeline, scoring engine, ranking engine, allocation logic, timing engine, FX layer, budget execution, final order pack, order tracking, automation cron, and Telegram alerting.

---

# A) INDUSTRIAL CONTROL LAYER (PRESERVED + UPDATED)

## A.1 CURRENT EXECUTION STATE (AUTHORITATIVE)
phase: Automation + Alerts Validation Completed  
step: Save and restart cleanly  
task: update master snapshot and create handoff for automation / alerts stage  
status: COMPLETED — END-TO-END MVP OPERATIONAL  

## A.2 CURRENT POSITION
- Core Nexial MVP = validated
- Alerts / execution / tracking / KPI loop = validated
- Dashboard = validated
- Product direction = clarified
- Structured DCA direction = validated conceptually
- Monitoring + decision engine architecture = implemented in working SQL layers
- Market data ingestion = validated with Twelve Data
- `update-market-data` Edge Function = deployed and working
- `market_data_daily` write path = fixed and validated
- `asset_scoring_v1` = created and validated
- `asset_scoring_v2` = created and validated with dynamic return logic
- `opportunity_ranking_v1` = created and validated
- `decision_output_v1` = created and validated
- `allocation_v1` = created and validated
- `invest_now_input` = created and validated
- `invest_now_v1` = dynamic budget input integrated
- `execution_orders_v1` = created and validated
- `invest_recommendation_v1` = created and validated
- `timing_engine_v1` = created and validated
- `portfolio_positions` = created and seeded for test
- `portfolio_status_v1` = created and validated
- `portfolio_arbitrage_v1` = created and validated
- `position_sizing_v1` = created and validated
- `portfolio_decision_output_v1` = created and validated
- `fx_rates` / `fx_latest` / `execution_orders_fx_v1` = created and validated
- `budget_execution_v1` = created and validated
- `capital_optimization_v1` = created and validated
- `final_order_pack_v1` = created and validated
- `order_tracking_v1` = created and validated
- `order_status_engine_v1` = created and validated
- `send-order-alert` Edge Function = created and Telegram connectivity validated
- Cron scheduling = created for market refresh and order monitoring
- Telegram bot = created and test message validated
- Next major milestone = harden automation with anti-spam, order-status lifecycle, and dashboard integration

## A.3 CURRENT STEP
**Phase — Save / Handoff / Cleanup**  
**Exact current step:** update core snapshot and create a dedicated handoff for the automation + alerts stage.

## A.4 NEXT ACTION (MANDATORY)
At next session, do only:
1. read this v5.4 snapshot
2. confirm current phase and current step
3. verify automation state if needed:
   - cron jobs
   - `send-order-alert`
   - `order_status_engine_v1`
   - Telegram alert path
4. implement anti-spam layer for Telegram alerts
5. add alert lifecycle status to avoid duplicate notifications
6. validate with a controlled trigger
7. update snapshot / handoff

## A.5 SESSION CALENDAR / STEP SEQUENCING
### Session 1 — COMPLETED
- create `asset_scoring_v1`
- define weighted scoring logic
- validate

### Session 2 — COMPLETED
- create market-data ingestion via Supabase Edge Function
- reject Alpha Vantage and Yahoo for MVP reliability
- select Twelve Data
- validate DB write path

### Session 3 — COMPLETED
- create opportunity ranking view
- integrate top 3 logic
- validate

### Session 4 — COMPLETED
- create decision output view
- integrate BUY / WATCH / IGNORE logic
- validate

### Session 5 — COMPLETED
- create allocation layer
- integrate dynamic invest amount
- validate

### Session 6 — COMPLETED
- create execution orders
- integrate pullback limit logic
- validate

### Session 7 — COMPLETED
- create timing engine
- integrate WAIT_PULLBACK logic
- validate

### Session 8 — COMPLETED
- create portfolio integration
- compare existing positions vs opportunities
- validate arbitrage logic

### Session 9 — COMPLETED
- create FX layer
- convert USD orders into EUR budget logic
- validate

### Session 10 — COMPLETED
- create budget execution and capital optimization
- respect strict available capital
- validate best executable order

### Session 11 — COMPLETED
- create final order pack
- create order tracking
- create order status engine
- validate PENDING / WAITING state

### Session 12 — COMPLETED
- create automation cron jobs
- create Telegram alert function
- validate Telegram bot and chat_id
- validate test message

### Next Session — LOCKED
- create anti-spam alert lifecycle
- mark alerts as sent
- prevent duplicate Telegram notifications
- optionally auto-update order status after trigger

## A.6 EXECUTION RULE (MANDATORY)
- Only execute the current step
- Do not jump ahead
- Do not add unrelated features
- Do not drift into cosmetic UI before the alert lifecycle is hardened
- If a request is outside the current step, re-anchor to the current step unless explicitly reprioritized
- When SQL structure is involved, check real view/table columns before writing dependent SQL
- For every new dynamic view, if output columns change, use `DROP VIEW IF EXISTS ...` then `CREATE VIEW ...`
- For Supabase Edge Functions, distinguish strictly between local VS Code files and deployed Supabase UI code

## A.7 CHATGPT PERFORMANCE DIRECTIVE (MANDATORY)
For this project, ChatGPT must operate in **optimal industrial mode**.

### Required behavior
1. Always produce the most complete operational answer possible
2. Never output a lossy or over-compressed snapshot
3. Always end with:
   - current position
   - current step
   - next action
4. Always optimize for:
   - continuity
   - reproducibility
   - execution performance
   - minimum wasted iterations
5. Never rely on vague assumptions when schema or implementation detail matters
6. Prefer one validated step over several partially defined steps
7. When updating the master snapshot, preserve all prior useful information unless explicitly obsolete
8. When user requests a complete master, provide a complete master, not a compressed summary
9. When a step fails, isolate the smallest true cause before changing architecture
10. Never continue with a provider or approach that is proven structurally unsuitable for Nexial testing

### Forbidden behavior
- incomplete handoff
- hidden information loss
- speculative SQL when exact schema is required
- multiple competing implementation directions in the same step
- drifting away from the agreed execution phase
- compressing a master file into a shorter summary version if the user requests a full master
- proposing fake progress by limiting scope when the real system needs broader validation
- continuing with placeholder secrets / URLs in cron jobs
- assuming deployed Edge Function code matches local VS Code files

### Final internal rule
**If quality is uncertain, improve before responding.**

## A.8 HANDOFF / ARCHIVE DISCIPLINE
### Active file rule
There must be exactly **one** active master file in `Doc/02_core/` and, if desired, one dedicated handoff file in `Doc/01_handoff/`.

### End-of-session rule
1. update the active core snapshot
2. create a dedicated handoff for the exact operational restart point if useful
3. save new version as the new active file
4. move previous active file into archive only when the user explicitly decides to promote the version

### Start-of-session rule
1. paste latest active core snapshot or refer to the active file
2. say “on reprend Nexial”
3. continue strictly from `CURRENT EXECUTION STATE`

## A.9 SESSION LOG (ACTIVE)
### 2026-04-21 / 2026-04-22
- Core system validated
- Dashboard validated
- Alerts / execution / tracking / KPI loop validated
- Handoff / archive discipline introduced
- DCA piloté identified as major milestone
- Monitoring + decision engine architecture clarified
- Performance-first decision framework defined
- Need for exact restart continuity formally identified
- Decision Engine V1 selected as next concrete build target

### 2026-04-23
- Market data pipeline validation started
- Alpha Vantage tested and rejected due to quota limitations
- Yahoo Finance tested and rejected due to rate limiting / instability
- Twelve Data selected for MVP market data testing
- `TWELVE_DATA_API_KEY` configured as Supabase Edge Function secret
- `update-market-data` function deployed
- `assets_v1` read path validated
- `market_data_daily` write path initially failed due to permission issue
- `service_role` grants added and write path validated
- `market_data_enabled`, `market_data_provider`, `provider_symbol` added to `assets_v1`
- unsupported / ambiguous assets disabled for Twelve Data test: `PANX`, `WPEA`, `MC`
- successful updated results confirmed for AAPL, MSFT, ASML

### 2026-04-24
- `asset_scoring_v1` created and validated
- existing non-view object conflict handled by renaming legacy object
- `asset_scoring_v2` created with dynamic 1-day return logic
- artificial prior-day market data inserted for test history
- `opportunity_ranking_v1` created and validated
- `decision_output_v1` created and validated
- `allocation_v1` created and validated
- `invest_now_v1` created with 1000€ test amount then replaced by dynamic input
- `execution_orders_v1` created and iterated to handle forced 1-share logic
- user identified critical product rule: best opportunity may be above budget; system must respect first user request and propose executable alternative only if acceptable
- `invest_recommendation_v1` created and validated:
  - best opportunity: ASML
  - executable alternative: MSFT
  - decision: EXECUTE_ALTERNATIVE when budget = 500€
- `timing_engine_v1` created and validated:
  - MSFT valid but above target
  - decision: WAIT_PULLBACK
- portfolio integration started
- `portfolio_positions` created and seeded with test MSFT and ASML positions
- `portfolio_status_v1` created
- `portfolio_arbitrage_v1` created and validated
- `position_sizing_v1` created and validated
- weak edge rule introduced:
  - score_delta <= 0.3 = NO_EDGE / HOLD
  - score_delta > 0.3 = WEAK_SWITCH / OPTIONAL_TRIM
  - score_delta > 0.5 = STRONG_SWITCH / ROTATE_POSITION
- `portfolio_decision_output_v1` created and validated
- FX layer added:
  - `fx_rates`
  - `fx_latest`
  - `execution_orders_fx_v1`
- budget execution corrected:
  - initial cumulative logic blocked after ASML
  - corrected to choose best executable candidate within strict budget
  - `budget_execution_v1` validated: MSFT 1 share, ~373.55€, cash remaining ~126.45€
- `capital_optimization_v1` created and validated:
  - optimal result with 500€ budget: MSFT single position
- `final_order_pack_v1` created and validated:
  - MSFT, 1 share, limit 403.43 USD, ~373.55 EUR, CTO, LIMIT_ORDER, GTC
- `order_tracking_v1` created and order inserted:
  - MSFT, 1, 403.43 USD, status PENDING
- `order_status_engine_v1` created and validated:
  - MSFT current price ~415.91 > 403.43
  - execution_status = WAITING
- automation started:
  - `send-order-alert` Edge Function created
  - `pg_cron` scheduling added
  - initial cron jobs had placeholder keys; corrected by replacing with real service role key
- Telegram bot created:
  - bot username: `nexial_invest_alerts_bot`
  - chat_id identified: `7353714576`
  - Telegram test message validated successfully
- `send-order-alert` function debugged:
  - Telegram-only test OK
  - Supabase permissions corrected for service_role select grants
  - function returned `{ alerts: 0, message: "No triggered orders" }`
- controlled alert trigger tested:
  - `order_tracking_v1.limit_price_native` temporarily set to 420 for MSFT
  - Telegram alert successfully received
- order limit must be reset to 403.43 after trigger test

### Next expected log entry
- order limit reset to 403.43 confirmed
- anti-spam alert lifecycle implemented
- alert sent flag / notification log created
- duplicate alert prevention validated

## A.10 HARD RULES TO PRESERVE
- DCA mode must always invest
- Never propose an unbuyable asset
- ETF fallback is mandatory in DCA mode
- Maximum 2 positions in DCA mode where that rule applies
- Simplicity must remain equal to or better than banking-product UX
- Nexial must feel like a banking investment product, but materially more performant and transparent
- No edge = no action
- Cash is an active position
- Every euro must be compared against its best alternative use
- Best theoretical opportunity is not always best executable recommendation
- User budget constraint has priority over theoretical ranking
- If best opportunity is too expensive, report it but propose best executable acceptable alternative
- If executable alternatives are weak, output NO ACTION / WAIT
- Do not force diversification if it reduces capital efficiency
- Do not buy on breakout; prefer limit orders on pullback
- Do not overtrade marginal score deltas
- Weak edge must not trigger portfolio rotation

## A.11 RESTART VALIDATION (MANDATORY)

Before executing ANY step after restart, ChatGPT must:

1. Explicitly confirm:
   - snapshot read
   - current phase
   - current step

2. Confirm:
   "No drift detected, proceeding with locked step"

3. Only then execute the step

If this validation is missing → restart is considered invalid

---

# B) FULL PREVIOUS MASTER CONTENT PRESERVED BELOW (NO DELETION)

# NEXIAL — MASTER HANDOFF / EXECUTION SNAPSHOT v3.3
**Status:** STABLE CORE + ALERT/EXECUTION/TRACKING MVP VALIDATED  
**Date:** 2026-04-21  
**Timezone:** Europe/Paris  
**Purpose:** master continuity file to restart in a new chat **without loss of product intent, technical state, or execution discipline**.

---

# 1) PRODUCT VISION — WHAT NEXIAL IS

## Core positioning
Nexial is **not** a generic analytics dashboard and **not** a trading toy.  
Nexial is a **decision engine for investing** that answers:

> **“What should I do now with my capital?”**

The user should not need to monitor markets daily.

## Target initial users
Primary audience:
- motivated beginners or intermediates
- willing to invest regularly
- limited market knowledge
- little time to follow markets
- currently using simple monthly DCA into a World ETF because it is easy and safer than doing nothing

## Direct competitor
The true competitor is:

> **automatic monthly DCA into a World ETF**

That benchmark wins on:
- simplicity
- regularity
- reassurance
- low cognitive load

Nexial must therefore be:

> **as simple as ETF DCA, but more performant, more intelligent, and still disciplined**

## Product promise
The user should be able to say:

> **“I invest 500€ / month. Nexial does the rest.”**

---

# 2) PRODUCT PRINCIPLES — NON-NEGOTIABLE

## Strategic principles
1. **Simplicity first**
   - the product must stay extremely understandable
   - no unnecessary complexity
   - no over-configuration for the user

2. **Actionability**
   - 1 alert = 1 action
   - Nexial must produce decisions, not just analysis

3. **Discipline**
   - no emotional investing
   - consistent process
   - repeatable execution

4. **Capital efficiency**
   - every euro must be allocated to the best available risk/reward opportunity
   - opportunity cost matters

5. **Measured performance**
   - decisions must be tracked
   - outcomes must be measured
   - Nexial must learn from real executions

6. **Low-friction UX**
   - user should not need daily market follow-up
   - user acts when alerted or follows a monthly plan

---

# 3) CORE PRODUCT THESIS

## Initial market insight
Many users do this today:
- monthly DCA
- into one World ETF
- because it is easy and they believe long-term average market return beats cash products like Livret A

This is a good baseline, but limited.

## Nexial advantage
Nexial aims to outperform simple automatic ETF DCA through:
- better entry timing
- better asset selection
- better wrapper selection (PEA vs CTO)
- better FX awareness
- lower cost discipline
- better capital allocation

## Product category
Nexial resembles a “banking investment product”, but:
- with better expected performance
- with much better transparency
- with lower hidden costs
- with much better decision logic

---

# 4) HIGH-LEVEL PRODUCT MODES (CURRENT / FUTURE)

## Already validated conceptually
Nexial must support multiple user modes, not a single rigid strategy.

### Mode A — Basic automatic DCA
Benchmark mode:
- invest monthly
- mostly ETF-based
- very simple

### Mode B — Guided / smart DCA
Same monthly discipline, but smarter:
- optimized asset selection
- timing-aware
- wrapper-aware
- always invests every month

### Mode C — Watchlist-driven DCA
User says:
- “I invest 500€/month”
- Nexial selects or assigns a suitable watchlist
- Nexial monitors that watchlist and allocates the monthly amount intelligently

### Mode D — Opportunity mode
More selective:
- can wait
- can hold cash
- only acts on stronger pullbacks / opportunities

## Important distinction
- **Opportunity mode** may legitimately return `WAIT`
- **DCA mode** must **always invest** (or users will not understand its purpose)

---

# 5) CRITICAL DCA RULES DISCUSSED AND VALIDATED

These points were explicitly identified as essential.

## Rule 1 — DCA must invest regularly
If user selected a DCA mode and defined a monthly amount, Nexial must not systematically skip months.

**Implication:**  
For DCA:
- if no ideal candidate exists, use a fallback allocation
- do not leave the user confused with repeated “do nothing” results

## Rule 2 — Never propose an unbuyable asset
If the user invests 500€ / month:
- Nexial must consider whether the candidate is actually buyable
- if one share costs more than the available envelope and fractional logic is not supported for that context, exclude it
- propose another asset instead

## Rule 3 — Fallback is mandatory for DCA
If no “perfect” candidate is available:
- allocate to a strong default asset
- likely ETF fallback / core asset fallback
- avoid a UX where “DCA” results in repeated non-investment

## Rule 4 — Watchlist must be optimized
Watchlist should be selected according to:
- expected performance
- diversification
- risk level
- monthly investable amount
- envelope used (PEA / CTO / mix)
- investment horizon

## Rule 5 — Simplicity over complexity
Even if internal logic is sophisticated, user-facing outcome must stay simple:
- “This month invest 500€”
- “300€ here, 200€ there”
- “why” in one or two short reasons

---

# 6) PEA / CTO PRODUCT LOGIC

## Important product point
For French users, Nexial must exploit:
- fiscal advantages of PEA
- performance access of CTO
- wrapper arbitration to improve net returns

## Current vision
Users seeking more performance should often be oriented toward:
- **PEA + CTO together**
rather than PEA-only in all cases.

## Wrapper logic
The engine should eventually arbitrate:
- PEA for eligible assets / core long-term tax-efficient holdings
- CTO for US growth / non-PEA assets / selected opportunities

## Existing metric already aligned
Current product principle:
> **real performance = alpha + FX – tax**

This is a strong differentiator.

---

# 7) CURRENT TECHNICAL STATE — WHAT WAS ALREADY WORKING BEFORE DECISION ENGINE V1

The following was built and validated before the current decision-engine and automation expansion.

## Core validated workflow
End-to-end working path:
1. identify opportunity
2. create alert
3. display alert
4. execute or dismiss
5. log execution
6. update PnL
7. compute KPIs
8. show dashboard

## Database objects validated

### Alerts
- `alerts_v1`

### Execution tracking
- `execution_log_v1`

### Price tracking
- `price_snapshots_v1`

## SQL views validated

### Opportunity / alert pipeline
- `vw_alert_candidates_v1`
- `vw_alert_eligible_v1`
- `vw_alert_ranked_v1`
- `vw_next_alert_to_send_v1`

### Dashboard
- `vw_dashboard_nexial_header_v1`
- `vw_dashboard_active_alerts_v1`
- `vw_dashboard_recent_executions_v1`
- `vw_dashboard_top_tickers_v1`
- `vw_dashboard_alert_status_v1`
- `vw_dashboard_execution_status_v1`

### KPI / scoring
- `vw_nexial_kpis_v1`
- `vw_nexial_score_v1`
- `vw_nexial_score_v2`
- `vw_nexial_time_kpis_v1`

### Price views
- `vw_latest_prices_v1`

## SQL functions validated

### Alerts
- `fn_generate_alerts_v1()`

### Alert lifecycle
- `fn_execute_alert_v1(p_alert_id uuid)`
- `fn_dismiss_alert_v1(p_alert_id uuid)`
- `fn_expire_alerts_v1()`

### Logging actions
- `fn_log_execute_alert_v3(...)`
- `fn_log_dismiss_alert_v2(p_alert_id uuid)`

### PnL updates
- `fn_update_execution_pnl_v1(p_execution_id uuid, p_price_last numeric)`
- `fn_update_all_pnl_v1()`
- `fn_update_horizon_pnl_v1()`

### Utility
- `set_alerts_v1_updated_at()`

---

# 8) FRONTEND STATE — WHAT EXISTS

## Existing route
- `/dashboard`

## Existing frontend components / API
- dashboard page implemented and connected to SQL views
- client component for actions:
  - `AlertActions.tsx`
- API routes:
  - `/api/alerts/execute`
  - `/api/alerts/dismiss`

## Current dashboard capabilities
The dashboard can show:
- Nexial score
- win rate
- live PnL
- J+1 PnL
- execution rate
- active alerts
- recent executions
- top ideas

## Important UX reality
If there is no active alert, buttons do not show.  
This is normal because executed / dismissed alerts are no longer in active alerts.

---

# 9) IMPORTANT TECHNICAL LESSONS LEARNED

The start of earlier sessions was not optimal. The current session improved that discipline.

## What went wrong earlier
1. Too many schema assumptions too early
2. SQL was proposed before fully validating actual column names
3. Several iterations lost time due to:
   - wrong fields
   - old table structures
   - mismatched view columns
   - confusion between active vs executed alert lifecycle
4. There was no strict implementation plan at the beginning

## What improved in the latest build
1. Schema was checked when errors occurred
2. PostgreSQL view replacement rules were learned:
   - if output column structure changes, use DROP + CREATE
3. Supabase Edge Function deployment path was clarified:
   - local VS Code file does not update deployed function unless deployed via CLI
   - Supabase UI code is the deployed version during UI tests
4. API provider suitability was tested instead of assumed
5. Budget execution logic was corrected based on real output
6. User identified product logic gaps at the right time:
   - best opportunity may be unaffordable
   - system must prioritize executable recommendations under user budget
7. Telegram API was debugged with minimal isolated test before reintegrating Supabase logic

## Mandatory method from now on
1. **read snapshot**
2. **check exact schema before writing SQL**
3. **implement one step only**
4. **test immediately**
5. **validate**
6. **update snapshot**
7. **move to next step**

This discipline is mandatory.

---

# 10) CURRENT LIMITS / WHAT IS NOT YET DONE

The system is now operational at MVP level, but strategic product layers remain incomplete.

## Major remaining gaps
1. No structured DCA mode yet
2. No user DCA configuration table yet
3. No watchlist template system yet
4. No user-to-watchlist assignment logic yet
5. No complete profile system yet (performance / diversification / risk / horizon)
6. No robust PEA/CTO onboarding logic yet
7. Notifications exist but lack anti-spam lifecycle
8. Cron exists but production monitoring / logs still need hardening
9. No full frontend integration for the new decision pipeline yet
10. No broker execution integration yet
11. No live FX provider integration yet beyond manual FX table input
12. No complete real portfolio import yet
13. No order alert sent flag yet
14. No automatic status update from triggered to notified / filled yet

## Product gap of highest importance
The next real milestone after alert hardening is:

> **Structured DCA piloté with optimized watchlists**

This is the key bridge between:
- a good engine
- and a product that can beat “World ETF DCA” for retail users

---

# 11) THE KEY PRODUCT INSIGHT TO PRESERVE

This is one of the most important conclusions of the discussion:

> **Nexial should feel like a banking investment product, but much better performing, cost-aware, transparent, and intelligently managed.**

That means:
- simple onboarding
- simple monthly plan
- sophisticated backend logic hidden behind a clean UX
- disciplined recurring investment behavior
- fee awareness
- no unnecessary complexity
- strict execution discipline
- clear final order only when the edge is real and executable

---

# 12) CURRENT DCA / WATCHLIST DIRECTION (IMPORTANT TO REMEMBER)

## Validated conceptual direction
Instead of asking beginners to select assets manually, Nexial should eventually do:

### User provides
- monthly amount
- horizon
- objective
- maybe risk preference

### Nexial does
- select the most appropriate watchlist template
- monitor the few relevant assets
- allocate the monthly amount intelligently
- always invest in DCA mode
- fallback when no ideal opportunity exists

## Watchlist logic
Potential structure:
- few assets only
- optimized by:
  - performance objective
  - diversification
  - risk
  - monthly amount
  - wrapper used
  - horizon

## Important product statement
User should not need to say:
- “I want MSFT, ASML, ETF World…”

Instead user should be able to say:
- “I invest 500€ / month”
- “I want performance”
- “I can tolerate medium risk”

And Nexial should infer the right watchlist and monitor it.

---

# 13) DISCUSSED FUTURE DATA MODEL (PARTLY IMPLEMENTED ELSEWHERE, DCA NOT YET IMPLEMENTED)

These structures were discussed as likely next steps.

## User DCA config
Suggested future table:
- `user_dca_config_v1`

Likely fields:
- `user_id`
- `monthly_amount`
- `objective`
- `risk_level`
- `horizon_years`
- `strategy`
- `wrapper_preference`

## Watchlist templates
Suggested future table:
- `watchlist_templates_v1`

Likely fields:
- `id`
- `name`
- `objective`
- `risk_level`
- `min_monthly_amount`
- `max_monthly_amount`

## Watchlist items
Suggested future table:
- `watchlist_template_items_v1`

Likely fields:
- `template_id`
- `ticker`
- `priority`
- `max_weight`
- `entry_zone_low`
- `entry_zone_high`

## Derived views
Likely future views:
- `vw_user_selected_watchlist_v1`
- `vw_user_watchlist_v1`
- `vw_dca_plan_v1`

---

# 14) CURRENT MVP LOGIC THAT SHOULD STAY TRUE

These operating rules must remain stable even as the product grows.

## Alerts
- 1 alert = 1 action
- active alert disappears once executed or dismissed
- one final decision per alert
- no non-actionable alert
- Telegram alerts must not spam
- once an alert is sent, it must be tracked

## Execution
- one alert must not generate contradictory final outcomes
- duplicate logs must be prevented
- order pack must output one clear executable instruction
- no market order if timing logic says wait / pullback

## Tracking
- trades must be measurable
- PnL must be updateable
- D1 / D7 / D30 should become standard tracking dimensions
- order status must move through a clear lifecycle

## Scoring
- Nexial score must reflect:
  - timing quality
  - medium-term quality
  - execution discipline
- static scoring is insufficient alone
- dynamic score needs market data history

## Budget / execution
- user’s stated budget must be respected
- if best opportunity is unaffordable, report it separately
- best executable alternative must meet minimum score threshold
- if no acceptable executable asset exists, return WAIT / NO ACTION

---

# 15) FILES / ROUTES / COMPONENTS TO REMEMBER

## Frontend
- `src/app/dashboard/page.tsx`
- `src/components/dashboard/AlertActions.tsx`

## API
- `src/app/api/alerts/execute/route.ts`
- `src/app/api/alerts/dismiss/route.ts`

## Important route
- `/dashboard`

## Supabase Edge Functions
- `update-market-data`
- `send-order-alert`

## Local project path reminder
Local file path observed:
- `supabase/functions/update-market-data/index.ts`

Important:
- editing local `index.ts` does not update deployed Supabase function unless deployed via CLI
- during current sessions, deployed function was edited in Supabase UI

---

# 16) EXECUTION ROADMAP — MASTER PLAN UPDATED

This is the planning discipline that must be followed from now on.

## Phase 0 — Stabilization
**Status: DONE**
- backend core working
- dashboard working
- alerts / executions / KPIs working

## Phase 1 — True project discipline / backup
**Status: ACTIVE / IMPROVED**
Goal:
- stop messy restart sessions
- create reliable restart process
- create step-by-step execution plan
- update snapshot every session

### Tasks
- [x] finalize master handoff file v5.3
- [x] define implementation phases formally
- [x] define one-step-at-a-time workflow
- [x] define session close checklist
- [x] define session restart checklist
- [x] create dedicated handoff file for market data
- [ ] create dedicated handoff file for automation + alerts
- [ ] archive older masters when v5.4 is promoted

## Phase 2 — Market Data Pipeline
**Status: DONE / MVP VALIDATED**
Goal:
- fetch market prices from usable provider
- store prices in DB
- support scoring and execution logic

### Tasks
- [x] test Alpha Vantage
- [x] reject Alpha Vantage due to quota
- [x] test Yahoo
- [x] reject Yahoo due to rate limiting
- [x] configure Twelve Data
- [x] create / update `update-market-data` Edge Function
- [x] add `market_data_enabled`, `market_data_provider`, `provider_symbol`
- [x] filter unsupported assets
- [x] validate `market_data_daily` write path

## Phase 3 — Decision Engine V1
**Status: DONE / MVP VALIDATED**
Goal:
- create deterministic decision chain from data to final order

### Tasks
- [x] create `asset_scoring_v1`
- [x] create `asset_scoring_v2`
- [x] create `opportunity_ranking_v1`
- [x] create `decision_output_v1`
- [x] create `allocation_v1`
- [x] create `invest_now_input`
- [x] create `invest_now_v1`
- [x] create `execution_orders_v1`
- [x] create `invest_recommendation_v1`
- [x] create `timing_engine_v1`
- [x] create `final_order_pack_v1`

## Phase 4 — Portfolio Integration
**Status: DONE / MVP VALIDATED**
Goal:
- compare current portfolio vs opportunities
- detect whether to hold, trim, or rotate

### Tasks
- [x] create `portfolio_positions`
- [x] create `portfolio_status_v1`
- [x] create `portfolio_arbitrage_v1`
- [x] create `position_sizing_v1`
- [x] create `portfolio_decision_output_v1`

## Phase 5 — FX / Budget / Capital Optimization
**Status: DONE / MVP VALIDATED**
Goal:
- convert native orders into EUR budget logic
- select best executable order under budget

### Tasks
- [x] create `fx_rates`
- [x] create `fx_latest`
- [x] create `execution_orders_fx_v1`
- [x] create `budget_execution_v1`
- [x] create `capital_optimization_v1`
- [x] validate MSFT single-position optimal result for 500€

## Phase 6 — Automation
**Status: PARTIAL / FUNCTIONAL MVP**
Goal:
- make Nexial proactive

### Tasks
- [x] create `order_tracking_v1`
- [x] insert generated final order into tracking
- [x] create `order_status_engine_v1`
- [x] create `send-order-alert` Edge Function
- [x] validate Telegram bot
- [x] identify chat_id
- [x] validate Telegram test message
- [x] grant service_role read permissions
- [x] validate `alerts: 0` no-trigger state
- [x] validate triggered Telegram alert
- [x] create cron job for market data refresh
- [x] create cron job for order alert check
- [ ] reset test order limit to real limit after alert test
- [ ] create anti-spam alert lifecycle
- [ ] create notification log
- [ ] auto-update order status after trigger

## Phase 7 — Structured DCA product
**Status: NOT STARTED**
Goal:
- turn Nexial into a strong DCA alternative to World ETF DCA

### Tasks
- [ ] create user DCA config table
- [ ] define strategy modes (AUTO / PILOTED / WATCHLIST)
- [ ] create watchlist templates
- [ ] create template items
- [ ] create user-to-template assignment logic
- [ ] create user watchlist view
- [ ] create DCA allocation logic
- [ ] enforce “always invest” for DCA
- [ ] enforce price affordability filter
- [ ] create ETF fallback
- [ ] integrate PEA / CTO logic in DCA routing

## Phase 8 — Product UX
**Status: NOT STARTED**
Goal:
- make the product usable for beginners

### Tasks
- [ ] onboarding flow
- [ ] user objective selection
- [ ] monthly amount setup
- [ ] simplified explanation layer
- [ ] monthly plan UI
- [ ] watchlist visibility / control
- [ ] final order pack UI
- [ ] active order tracking UI
- [ ] Telegram / alert preferences UI

## Phase 9 — Learning / Optimization
**Status: LATER**
Goal:
- improve the engine based on real results

### Tasks
- [ ] improve alpha_score
- [ ] improve timing logic
- [ ] improve sizing logic
- [ ] measure DCA performance vs benchmark
- [ ] learning loops based on actual execution outcomes

---

# 17) SESSION OPERATING METHOD (MANDATORY)

## At start of next session
1. Read this file first
2. Identify the current phase
3. Pick one step only
4. Confirm exact schema if SQL is involved
5. Implement
6. Test
7. Validate
8. Update snapshot

## During session
- avoid parallel workstreams
- avoid speculative schema assumptions
- do not jump to next feature before validation
- prefer complete file / function versions when user asks
- when editing Edge Functions, explicitly state whether code is deployed via Supabase UI or local VS Code
- when setting cron jobs, never leave placeholder URLs or keys
- when using API tokens, never ask user to paste full secret in chat

## At session end
- update snapshot
- record completed items
- record next exact step
- record blockers
- restore any temporary test values to production-safe values

---

# 18) RECOMMENDED NEXT STEP FOR THE NEXT CHAT

The next chat should start here:

> **Automation hardening — alert anti-spam and order lifecycle**

## Exact recommended first step next time
1. confirm MSFT test order limit was reset to 403.43
2. create a notification log table
3. update `send-order-alert` to avoid duplicate Telegram alerts
4. optionally update order status after triggered alert
5. validate with a controlled trigger

Do **not** jump directly into dashboard UI or DCA product before alert lifecycle is hardened.

---

# 19) RESTART PROMPT FOR NEXT CHAT

Copy/paste this in the next conversation:

## Short restart prompt
We resume Nexial from the active core snapshot v5.4.  
Read the snapshot first, then continue with the exact next step:  
harden automation by adding Telegram anti-spam / alert lifecycle after confirming the MSFT order limit has been reset to 403.43.  
No schema guessing, no drifting, one validated step at a time.

## Ultra-short version
Nexial — resume from active core v5.4. Continue with alert anti-spam / order lifecycle.

---

# 20) FINAL STATE SUMMARY

## What is true now
- Nexial MVP core is real
- end-to-end alert / execution / tracking / KPI loop is working
- dashboard foundation exists
- product direction is much clearer
- performance-first monitoring + decision architecture is now implemented at MVP SQL level
- market data ingestion works through Twelve Data
- scoring / ranking / allocation / timing / FX / budget / order pack all work
- order tracking works
- order status monitoring works
- Telegram alert path works
- cron automation is configured
- exact restart continuity is formalized

## What matters most next
- reset test order value after alert validation
- anti-spam notification lifecycle
- order status lifecycle
- PnL tracking after execution
- frontend dashboard integration of final order / active orders / alerts
- structured DCA mode
- real portfolio import

## Core principle to preserve
> **Simple like ETF DCA, better like a smart investment engine.**

---

# C) PERFORMANCE ARCHITECTURE LAYER (ADDED / PRESERVED)

## C.1 OBJECTIVE

Create a performance-oriented autonomous system able to:
- reduce decision count
- maximize capital efficiency
- outperform simple DCA through selection, timing, allocation, and discipline

## C.2 ABSOLUTE RULES
- 1 response = executable immediately
- 0 interpretation user-side
- max 3 actions
- max 3 opportunities
- no buy without edge
- no buy on breakout
- no average-quality proposal
- if doubt = NO ACTION
- if edge is inferior to cash or a better alternative = NO ACTION
- every position must be compared to its opportunity cost
- user budget must be respected before theoretical allocation
- if best opportunity is unaffordable, show it as information, not as executable action
- if acceptable alternative exists within budget, propose it
- if no acceptable alternative exists, WAIT

## C.3 PRODUCT SHIFT
Nexial is:
- monitoring engine
- ranking engine
- decision engine
- arbitration engine
- execution engine
- automation engine
- alerting engine

## C.4 MARKET REGIME ENGINE
States:
- BULL
- NEUTRAL
- WEAK
- STRESS

Inputs:
- trend
- moving averages
- breadth
- volatility
- momentum
- macro stress

Rule:
No proposal without regime context.

Status:
- conceptual only
- not yet implemented in SQL V1

## C.5 MONITORING ENGINE
Tracks:
- portfolio
- watchlists
- active orders
- drawdowns
- scores
- opportunity hierarchy
- order status
- alert trigger state

Asset status:
- OK
- WATCH
- ACTION
- URGENT

Priority:
- P0
- P1
- P2
- P3

## C.6 RHYTHM ENGINE
Modes:
- DAILY
- WEEKLY
- EVENT-DRIVEN

Current implementation:
- daily price refresh cron configured
- order check every 5 minutes configured

## C.7 SCORING ENGINE
Score /10 based on initial MVP:
- Quality
- Growth
- Momentum
- Valuation
- Market data availability

Initial conceptual target:
- Quality 30%
- Growth 25%
- Momentum 25%
- Valuation 20%

Current implemented V1/V2:
- `asset_scoring_v1` includes quality / growth / momentum / valuation / market data score
- `asset_scoring_v2` adds dynamic `return_1d` and `score_v2`

Score logic:
- < 6.5 reject / low priority
- 6.5–7.9 watch / acceptable
- 8.0–8.9 opportunity
- 9.0+ priority

## C.8 OPPORTUNITY ENGINE
- top 3 maximum
- ranked shortlist only
- reject weak or dominated ideas

Current implementation:
- `opportunity_ranking_v1`
- `decision_output_v1`

## C.9 OPPORTUNITY COST ENGINE
Question:
“Is this the best use of this capital now?”

Compare:
- cash
- top alternatives
- positions
- fallback ETF if applicable

If no:
- reject

Current implementation:
- `portfolio_arbitrage_v1`
- `position_sizing_v1`
- weak edge threshold prevents overtrading

## C.10 TIMING ENGINE
Distinguish:
- real pullback
- false pullback
- normal noise
- forbidden breakout
- exploitable capitulation
- rebound already advanced

Output:
- BUY
- WAIT
- REJECT

Current implementation:
- `timing_engine_v1`
- output: `BUY_NOW_OR_LIMIT`, `WAIT_PULLBACK`, `NO_ACTION`, `NO_ACTION_WEAK_EDGE`

## C.11 ALLOCATION ENGINE
Handles:
- cash
- regime
- priority
- current weight
- account type
- pocket budget
- overweight condition

Cash is an active position.

Current implementation:
- `allocation_v1`
- `invest_now_v1`
- `budget_execution_v1`
- `capital_optimization_v1`

## C.12 PORTFOLIO ENGINE
Must detect:
- keep
- reinforce
- reduce
- arbitrate
- sell

Rule:
No existing line is protected by default.

Current implementation:
- `portfolio_positions`
- `portfolio_status_v1`
- `portfolio_arbitrage_v1`
- `position_sizing_v1`

## C.13 CIO FINAL DECISION LAYER
Validates:
- edge
- capital efficiency
- timing
- regime consistency
- portfolio consistency
- execution quality

Output:
- BUY precise
- HOLD / REDUCE / ARBITRATE precise
- NO ACTION

Current implementation:
- `portfolio_decision_output_v1`
- `final_order_pack_v1`

## C.14 ENTRY PLAN ENGINE
Outputs:
- asset
- account
- amount / quantity
- limit price
- validity
- priority
- justification

Supports:
- simple order
- split entry
- multi-level
- order pack

Current implementation:
- `final_order_pack_v1`

## C.15 ORDER PACK SYSTEM
Allows:
- multiple linked orders
- unique validation
- grouped status
- coherent tracking

Current implementation:
- MVP single-order pack validated for MSFT
- multi-order combinatorial optimization tested conceptually through `capital_optimization_v1`

## C.16 ORDER WATCH ENGINE
Monitors:
- market
- asset
- regime
- spread
- volatility
- news
- loss of edge
- better opportunity

Actions:
- KEEP
- AMEND
- CANCEL
- ALERT

Current implementation:
- `order_tracking_v1`
- `order_status_engine_v1`

## C.17 ALERT ENGINE
Allowed alerts:
1. executed order
2. zone entry
3. reversal
4. obsolete order
5. better opportunity

No non-actionable alert.

Current implementation:
- `send-order-alert` Edge Function
- Telegram alert validated
- anti-spam not yet implemented

## C.18 MARKET DATA STRATEGY
Principle:
quasi real-time intelligent > tick-by-tick

Data:
- last
- bid/ask
- volume
- high/low
- variation
- distance to zones
- drawdown
- regime signals

Frequencies:
- critical orders / zones: 10–30s target future
- portfolio: ~1 min target future
- watchlist: 1–5 min target future

Current MVP:
- daily refresh cron for market data
- order-status check every 5 minutes
- Twelve Data free plan used for MVP testing

## C.19 PEA VS CTO
PEA:
- long-term
- lower frequency
- high selectivity
- buy on pullback only

CTO:
- opportunistic
- more dynamic
- faster rotation

Current implementation:
- `final_order_pack_v1` includes basic target account logic
- MSFT routed to CTO
- ASML marked PEA_OR_CTO in initial logic

## C.20 UX RULE — NO ACTION
NO ACTION must be framed as an active decision.
Explain:
- why no action
- why cash remains useful
- which opportunities are monitored
- which conditions would trigger action

Current implementation:
- `timing_engine_v1`
- `portfolio_decision_output_v1`
- `budget_execution_v1`

## C.21 DCA / DEPLOYMENT RULES
The system must manage:
- automatic DCA
- piloted DCA
- progressive deployment of large cash
- high market environments without blocking user too long

Rules:
- do not block user too long
- combine price logic and time logic if needed
- maintain minimum exposure when mode requires it
- use fallback if no perfect opportunity exists
- reserve true WAIT to opportunistic modes, not DCA modes

Current status:
- DCA not yet implemented
- Invest Now / opportunity mode implemented at MVP level

## C.22 TECH STACK
Current:
- Supabase / PostgreSQL
- Supabase Edge Functions
- Twelve Data API
- Telegram Bot API
- pg_cron / net.http_post
- Next.js frontend foundation

Future / conceptual:
- Temporal
- Polygon or better market-data provider
- IBKR API
- OpenAI Agents / Claude agents as support only

Rule:
AI is never the sole decision source.

---

# D) EXECUTION CONTROL — MANDATORY UPDATED

## D.1 ROLE

This file is the active execution system of Nexial.

It must:
- preserve continuity across chats
- lock the current build step
- prevent drift
- force one-step-at-a-time execution

## D.2 CURRENT EXECUTION STATE

PHASE:
Automation + Alerts Hardening

STATUS:
MVP END-TO-END OPERATIONAL / HARDENING REQUIRED

CURRENT POSITION:
Decision Engine V1 has been implemented at MVP SQL level and validated through final order pack, order tracking, automation, and Telegram alerting.

CURRENT STEP:
Save current state, reset temporary test order value, then implement alert anti-spam lifecycle.

NEXT ACTION:
1. Confirm MSFT `limit_price_native` reset to 403.43 after trigger test
2. Create notification log / alert sent tracking
3. Update `send-order-alert` to prevent duplicate Telegram messages
4. Validate no duplicate alerts after repeated function tests

## D.3 CURRENT BUILD TARGET

Immediate target:

**Automation hardening**

The build must harden alert lifecycle before dashboard work, DCA product, or broker execution.

## D.4 MANDATORY NEXT DELIVERABLE

The assistant must produce:

1. SQL table or columns for alert notification tracking
   Example possible object:
   - `order_notifications_v1`

2. Required fields likely:
   - id
   - order_id
   - ticker
   - notification_type
   - sent_at
   - channel
   - status

3. Function update:
   - `send-order-alert`
   - skip already-notified orders
   - send Telegram only once per trigger
   - record notification after successful Telegram send

4. Validation:
   - test with triggered order
   - confirm first test sends alert
   - confirm second test does not duplicate alert

## D.5 EXECUTION RULES
- one step at a time
- no jump ahead
- no theory when implementation is requested
- no UX redesign during automation hardening phase
- no scope drift toward unrelated systems
- if drift occurs, return to CURRENT STEP
- never leave temporary test values in production state
- never store full tokens in chat history beyond user’s local code

## D.6 RESPONSE FORMAT — MANDATORY

At the end of every Nexial build response, always include:

CURRENT POSITION:
Automation + Alerts — MVP operational, anti-spam pending

CURRENT STEP:
Automation hardening — prevent duplicate Telegram alerts

NEXT ACTION:
Create alert notification tracking and update `send-order-alert`.

## D.7 RESTART PROTOCOL

When user pastes this file in a new chat and says:

**“on reprend Nexial”**

the assistant must:
1. read the full file
2. read CURRENT EXECUTION STATE
3. resume exactly at CURRENT STEP
4. continue with implementation
5. preserve one-step-at-a-time discipline

## D.8 ANTI-DRIFT RULE
If the assistant starts to:
- re-explain the framework
- broaden scope
- propose competing implementation paths
- skip SQL / function code when implementation is required
- avoid the current step

it must self-correct and return immediately to CURRENT STEP.

## D.9 FINAL RULE
Nexial sessions must behave like an industrial execution workflow, not a generic conversation.

---

# E) FINAL OPERATIONAL SUMMARY UPDATED

## E.1 WHAT THIS FILE IS
This file is now:
- the active master snapshot
- the authoritative restart artifact
- the execution control file
- the anti-drift rulebook
- the continuity mechanism for new chats
- the record of the first end-to-end autonomous Nexial MVP

## E.2 HOW TO USE IT

### End of session
1. update this file
2. save new active version
3. create dedicated handoff if needed
4. archive the previous version only after user confirms promotion

### Start of new chat
1. paste this file or state that active core v5.4 is the reference
2. ask to resume Nexial
3. continue strictly from CURRENT EXECUTION STATE

## E.3 LOCKED NEXT STEP
The next implementation step is locked as:

`automation alert anti-spam / notification lifecycle`

No other feature should start before this is done and validated.

## E.4 FINAL PRODUCT PRINCIPLE
Nexial must remain:

> **Simple like ETF DCA, better like a smart investment engine.**

---

# F) CURRENT IMPLEMENTED OBJECTS — DECISION ENGINE V1 / AUTOMATION MVP

## F.1 Market Data Tables / Views / Functions
- `assets_v1`
- `market_data_daily`
- `fx_rates`
- `fx_latest`
- Supabase Edge Function: `update-market-data`

## F.2 Asset Provider Fields Added to `assets_v1`
- `market_data_enabled`
- `market_data_provider`
- `provider_symbol`

## F.3 Active Provider Decision
- Alpha Vantage: rejected
- Yahoo Finance: rejected
- Twelve Data: selected for MVP testing

## F.4 Current Enabled Market Data Assets
Validated updated assets:
- AAPL
- MSFT
- ASML

Disabled / excluded for current Twelve Data MVP:
- PANX
- WPEA
- MC

Reason:
- unsupported by current plan or ambiguous mapping

## F.5 Scoring / Ranking Views
- `asset_scoring_v1`
- `asset_scoring_v2`
- `opportunity_ranking_v1`
- `decision_output_v1`

## F.6 Invest Now / Allocation Views
- `allocation_v1`
- `invest_now_input`
- `invest_now_v1`
- `invest_recommendation_v1`
- `timing_engine_v1`

## F.7 Portfolio / Arbitrage Views
- `portfolio_positions`
- `portfolio_status_v1`
- `portfolio_arbitrage_v1`
- `position_sizing_v1`
- `portfolio_decision_output_v1`

## F.8 FX / Budget / Capital Optimization Views
- `execution_orders_fx_v1`
- `budget_execution_v1`
- `capital_optimization_v1`

## F.9 Final Order / Tracking / Alert Views
- `final_order_pack_v1`
- `order_tracking_v1`
- `order_status_engine_v1`

## F.10 Edge Functions
- `update-market-data`
- `send-order-alert`

## F.11 Automation / Cron
Configured jobs:
- `refresh-market-data`
- `check-order-status`

Important note:
- earlier cron jobs with placeholder service key were removed and recreated with real service_role key
- verify with `select * from cron.job;` if needed

## F.12 Telegram
Bot:
- username: `nexial_invest_alerts_bot`

Chat:
- chat_id: `7353714576`

Validation:
- Telegram direct test OK
- triggered Nexial alert OK

Security:
- never paste full bot token in chat
- bot token should eventually be moved to Supabase Edge Function Secrets instead of being hardcoded

---

# G) CURRENT VERIFIED DECISION OUTPUT EXAMPLE

## G.1 User Input
- amount_eur: 500
- risk_level: balanced
- horizon: long_term

## G.2 Opportunity Ranking
- ASML: best opportunity, score ~7.34
- MSFT: second, score ~7.13
- AAPL: third, score ~6.42

## G.3 Budget Reality
- ASML minimum executable capital required: ~1,273€ equivalent
- MSFT executable: ~373.55€ equivalent
- AAPL executable: ~245.74€ equivalent

## G.4 Capital Optimization Result
- optimal executable allocation for 500€: MSFT only
- cost: ~373.55€
- remaining cash: ~126.45€
- strategy: SINGLE_POSITION

## G.5 Final Order Pack
- ticker: MSFT
- quantity: 1
- limit_price_native: 403.43 USD
- limit_price_eur: ~373.55 EUR
- order_currency: USD
- order_type: LIMIT_ORDER
- validity: GOOD_TILL_CANCELLED
- target_account: CTO

## G.6 Order Status Before Trigger Test
- current_price: ~415.91
- limit_price_native: 403.43
- execution_status: WAITING

## G.7 Trigger Test
Temporary test:
- `limit_price_native` set to 420 for MSFT
- Telegram alert received successfully

Required cleanup:
- reset `limit_price_native` to 403.43 for MSFT

---

# H) IMMEDIATE CLEANUP REQUIRED BEFORE NEXT BUILD

## H.1 Reset test order limit
Run this if not already done:

```sql
update public.order_tracking_v1
set limit_price_native = 403.43
where ticker = 'MSFT';
```

## H.2 Confirm reset

```sql
select ticker, quantity, limit_price_native, order_status
from public.order_tracking_v1
where ticker = 'MSFT';
```

Expected:
- ticker: MSFT
- quantity: 1
- limit_price_native: 403.43
- order_status: PENDING

## H.3 Then implement anti-spam
Do not continue to dashboard, DCA, or broker execution before anti-spam is done.

---

# I) NEXT HANDOFF FILE TO CREATE

Create this file in `Doc/01_handoff/`:

`nexial_handoff_automation_alerts_2026-04-24.md`

It must include:
- end-to-end MVP state
- Telegram alert validation
- cron job state
- current blocker: anti-spam / duplicate alert prevention
- exact next SQL + Edge Function step

---

END