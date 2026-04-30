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

# 7) CURRENT TECHNICAL STATE — WHAT IS ALREADY WORKING

The following was built and validated during the session.

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

# 9) IMPORTANT TECHNICAL LESSONS LEARNED THIS SESSION

The start of this session was not optimal. That must improve.

## What went wrong
1. Too many schema assumptions too early
2. SQL was proposed before fully validating actual column names
3. Several iterations lost time due to:
   - wrong fields
   - old table structures
   - mismatched view columns
   - confusion between active vs executed alert lifecycle
4. There was no strict implementation plan at the beginning

## What must change
From now on:
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

The system is working, but the strategic product layer is not yet complete.

## Major gaps
1. No structured DCA mode yet
2. No user DCA configuration table
3. No watchlist template system
4. No user-to-watchlist assignment logic
5. No profile system (performance / diversification / risk / horizon)
6. No robust PEA/CTO onboarding logic
7. No automatic notification system
8. No formal execution roadmap table inside product data
9. No “true backup” operational process yet

## Product gap of highest importance
The next real milestone is:

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

# 13) DISCUSSED FUTURE DATA MODEL (NOT YET IMPLEMENTED)

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

## Execution
- one alert must not generate contradictory final outcomes
- duplicate logs must be prevented

## Tracking
- trades must be measurable
- PnL must be updateable
- D1 / D7 / D30 should become standard tracking dimensions

## Scoring
- Nexial score must reflect:
  - timing quality
  - medium-term quality
  - execution discipline

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

---

# 16) EXECUTION ROADMAP — MASTER PLAN

This is the planning discipline that must be followed from now on.

## Phase 0 — Stabilization
**Status: DONE**
- backend core working
- dashboard working
- alerts / executions / KPIs working

## Phase 1 — True project discipline / backup
**Status: NEXT REQUIRED**
Goal:
- stop messy restart sessions
- create reliable restart process
- create step-by-step execution plan
- update snapshot every session

### Tasks
- [ ] finalize master handoff file
- [ ] define implementation phases formally
- [ ] define one-step-at-a-time workflow
- [ ] define “session close” checklist
- [ ] define “session restart” checklist

## Phase 2 — Structured DCA product
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

## Phase 3 — Product UX
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

## Phase 4 — Automation
**Status: PARTIAL**
Goal:
- make Nexial proactive

### Tasks
- [ ] notifications
- [ ] cron jobs / scheduled runs
- [ ] automatic price updates
- [ ] automatic alert generation cadence
- [ ] monthly DCA execution proposals

## Phase 5 — Learning / Optimization
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

## At session end
- update snapshot
- record completed items
- record next exact step
- record blockers

---

# 18) RECOMMENDED NEXT STEP FOR THE NEXT CHAT

The next chat should start here:

> **Phase 1 / Phase 2 bridge**  
> Formal execution planning + begin structured DCA piloté implementation

## Exact recommended first step next time
1. formalize the implementation plan in a tracked checklist
2. create `user_dca_config_v1`
3. define DCA strategy modes
4. start watchlist template structure

Do **not** jump directly into notifications or cosmetic UI before DCA structure is defined.

---

# 19) RESTART PROMPT FOR NEXT CHAT

Copy/paste this in the next conversation:

## Short restart prompt
We resume Nexial from MASTER HANDOFF v3.3.  
Read the snapshot first, then continue with the exact next step:
formal project planning + start structured DCA piloté implementation.
No schema guessing, no drifting, one validated step at a time.

## Ultra-short version
Nexial — resume from v3.3 handoff. Start with formal execution planning, then DCA piloté structure.

---

# 20) FINAL STATE SUMMARY

## What is true now
- Nexial MVP core is real
- end-to-end alert / execution / tracking / KPI loop is working
- dashboard is working
- the product direction is now much clearer than at the start of the session

## What matters most next
- product discipline
- true backup / restart discipline
- DCA piloté architecture
- watchlist intelligence
- beginner-friendly simplicity

## Core principle to preserve
> **Simple like ETF DCA, better like a smart investment engine.**

---