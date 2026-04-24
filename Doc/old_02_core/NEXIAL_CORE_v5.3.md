# NEXIAL — MASTER SNAPSHOT v5.3 FULL (INDUSTRIAL EXECUTION / PERFORMANCE MAX / NO INFORMATION LOSS)

**Status:** ACTIVE MASTER FILE  
**Purpose:** preserve the full prior master snapshot **without deleting information**, while adding industrial control, execution discipline, restart precision, mandatory ChatGPT operating constraints, and the full performance-oriented monitoring/decision architecture.

---

# A) INDUSTRIAL CONTROL LAYER (PRESERVED)

## A.1 CURRENT EXECUTION STATE (AUTHORITATIVE)
phase: Decision Engine Build  
step: Create scoring engine SQL  
task: create `asset_scoring_v1`  
status: NOT_STARTED  

## A.2 CURRENT POSITION
- Core Nexial MVP = validated
- Alerts / execution / tracking / KPI loop = validated
- Dashboard = validated
- Product direction = clarified
- Structured DCA direction = validated
- Monitoring + decision engine = validated conceptually
- Next major milestone = build the deterministic Decision Engine V1 starting with scoring

## A.3 CURRENT STEP
**Phase — Decision Engine Build**  
**Exact current step:** create `asset_scoring_v1`

## A.4 NEXT ACTION (MANDATORY)
At next session, do only:
1. create `asset_scoring_v1`
2. define exact score fields
3. define total weighted score logic
4. validate schema
5. record result in session log
6. stop and update snapshot

## A.5 SESSION CALENDAR / STEP SEQUENCING
### Session 1
- create `asset_scoring_v1`
- define weighted scoring logic
- validate

### Session 2
- create market regime schema / view inputs
- define regime rules
- validate

### Session 3
- create opportunity ranking view
- integrate top 3 logic
- validate

### Session 4
- create decision output view
- integrate BUY / WAIT / REJECT logic
- validate

### Session 5
- create allocation layer
- integrate account routing and priority handling
- validate

### Session 6
- create order plan output
- define order fields / packs
- validate

## A.6 EXECUTION RULE (MANDATORY)
- Only execute the current step
- Do not jump ahead
- Do not add unrelated features
- Do not drift into notifications, automation, or cosmetic UI before scoring / regime / ranking structure is in place
- If a request is outside the current step, re-anchor to the current step unless explicitly reprioritized

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

### Forbidden behavior
- incomplete handoff
- hidden information loss
- speculative SQL when exact schema is required
- multiple competing implementation directions in the same step
- drifting away from the agreed execution phase
- compressing a master file into a shorter “summary version” if the user requests a full master

### Final internal rule
**If quality is uncertain, improve before responding.**

## A.8 HANDOFF / ARCHIVE DISCIPLINE
### Active file rule
There must be exactly **one** active master file in `core/` and, if desired, one copy in `handoff/`.

### End-of-session rule
1. update the active core snapshot
2. if useful, copy it for restart use
3. save new version as the new active file
4. move previous active file into archive

### Start-of-session rule
1. paste latest active core snapshot
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

### Next expected log entry
- `asset_scoring_v1` created or attempted
- exact validation result
- next locked step

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

## A.9 RESTART VALIDATION (MANDATORY)

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

> **Decision Engine V1 build**  
> Start with scoring engine SQL and keep one validated step at a time.

## Exact recommended first step next time
1. create `asset_scoring_v1`
2. define score fields
3. define weighted total score
4. validate

Do **not** jump directly into alerts, automation, portfolio UI, or notification layers before the scoring foundation is defined.

---

# 19) RESTART PROMPT FOR NEXT CHAT

Copy/paste this in the next conversation:

## Short restart prompt
We resume Nexial from the active core snapshot.  
Read the snapshot first, then continue with the exact next step:
build the Decision Engine V1 starting with the scoring engine SQL.
No schema guessing, no drifting, one validated step at a time.

## Ultra-short version
Nexial — resume from active core. Start with scoring engine SQL.

---

# 20) FINAL STATE SUMMARY

## What is true now
- Nexial MVP core is real
- end-to-end alert / execution / tracking / KPI loop is working
- dashboard is working
- the product direction is much clearer
- performance-first monitoring + decision architecture is now defined
- exact restart continuity is now formalized

## What matters most next
- deterministic scoring
- market regime logic
- ranking
- decision output
- execution discipline
- continuity

## Core principle to preserve
> **Simple like ETF DCA, better like a smart investment engine.**

---

# C) PERFORMANCE ARCHITECTURE LAYER (ADDED)

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

## C.3 PRODUCT SHIFT
Nexial is:
- monitoring engine
- ranking engine
- decision engine
- arbitration engine
- execution engine

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

## C.5 MONITORING ENGINE
Tracks:
- portfolio
- watchlists
- active orders
- drawdowns
- scores
- opportunity hierarchy

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

## C.7 SCORING ENGINE
Score /10 based on:
- Quality 30%
- Growth 25%
- Momentum 25%
- Valuation 20%

Score logic:
- < 6.5 reject
- 6.5–7.9 watch
- 8.0–8.9 opportunity
- 9.0+ priority

## C.8 OPPORTUNITY ENGINE
- top 3 maximum
- ranked shortlist only
- reject weak or dominated ideas

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

## C.12 PORTFOLIO ENGINE
Must detect:
- keep
- reinforce
- reduce
- arbitrate
- sell

Rule:
No existing line is protected by default.

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

## C.15 ORDER PACK SYSTEM
Allows:
- multiple linked orders
- unique validation
- grouped status
- coherent tracking

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

## C.17 ALERT ENGINE
Allowed alerts:
1. executed order
2. zone entry
3. reversal
4. obsolete order
5. better opportunity

No non-actionable alert.

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
- critical orders / zones: 10–30s
- portfolio: ~1 min
- watchlist: 1–5 min

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

## C.20 UX RULE — NO ACTION
NO ACTION must be framed as an active decision.
Explain:
- why no action
- why cash remains useful
- which opportunities are monitored
- which conditions would trigger action

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

## C.22 TECH STACK
- Supabase / PostgreSQL
- Temporal
- Polygon
- IBKR API
- OpenAI Agents (support only)

Rule:
AI is never the sole decision source.

---

# D) EXECUTION CONTROL — MANDATORY

## D.1 ROLE

This file is the active execution system of Nexial.

It must:
- preserve continuity across chats
- lock the current build step
- prevent drift
- force one-step-at-a-time execution

## D.2 CURRENT EXECUTION STATE

PHASE:
Decision Engine Build

STATUS:
NOT_STARTED

CURRENT POSITION:
Decision Engine V1 has not been implemented yet

CURRENT STEP:
Define SQL schema for the scoring engine

NEXT ACTION:
Create `asset_scoring_v1` with scoring fields and weighted total score logic

## D.3 CURRENT BUILD TARGET

Immediate target:

**Decision Engine V1**

The build must start with the scoring foundation before ranking, timing, allocation, or portfolio arbitration.

## D.4 MANDATORY NEXT DELIVERABLE

The assistant must produce:

1. SQL table:
   `asset_scoring_v1`

2. Required fields:
   - ticker
   - quality_score
   - growth_score
   - momentum_score
   - valuation_score
   - total_score
   - updated_at

3. Rule:
   - total_score on 10
   - weights:
     - quality 30%
     - growth 25%
     - momentum 25%
     - valuation 20%

4. Output:
   - SQL first
   - concise implementation notes only if useful

## D.5 EXECUTION RULES
- one step at a time
- no jump ahead
- no theory when implementation is requested
- no UX redesign during SQL build phase
- no scope drift toward unrelated systems
- if drift occurs, return to CURRENT STEP

## D.6 RESPONSE FORMAT — MANDATORY

At the end of every Nexial build response, always include:

CURRENT POSITION:
Decision Engine V1 — NOT STARTED

CURRENT STEP:
Decision Engine V1 — STEP 1:
Build scoring engine (foundation layer)

NEXT ACTION:
Create asset_scoring_v1 as foundation for:
- opportunity ranking
- timing filtering
- allocation

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
- skip SQL
- avoid the current step

it must self-correct and return immediately to CURRENT STEP.

## D.9 FINAL RULE
Nexial sessions must behave like an industrial execution workflow, not a generic conversation.

---

# E) FINAL OPERATIONAL SUMMARY

## E.1 WHAT THIS FILE IS
This file is now:
- the active master snapshot
- the authoritative restart artifact
- the execution control file
- the anti-drift rulebook
- the continuity mechanism for new chats

## E.2 HOW TO USE IT

### End of session
1. update this file
2. save new active version
3. archive the previous version if needed

### Start of new chat
1. paste this file
2. ask to resume Nexial
3. continue strictly from CURRENT EXECUTION STATE

## E.3 LOCKED NEXT STEP
The next implementation step is locked as:

`create asset_scoring_v1`

No other feature should start before this is done and validated.

## E.4 FINAL PRODUCT PRINCIPLE
Nexial must remain:

> **Simple like ETF DCA, better like a smart investment engine.**

---

## CURRENT EXECUTION STATE UPDATE — 2026-04-23

### Phase
Market Data Pipeline Validation

### Active Function
update-market-data

### Provider Decision (FINAL FOR THIS PHASE)
- Alpha Vantage: rejected (quota incompatible with product)
- Yahoo Finance: rejected (rate limiting / instability)
- Twelve Data: selected (800 calls/day, usable for MVP testing)

### System Status
- Supabase Edge Function deployed and callable
- Secrets configured and working
- assets_v1 readable and used as universe source
- Twelve Data returns valid prices for several assets
- Fetch + parsing layer validated

### Confirmed Data Integrity
- AAPL → price OK
- MSFT → price OK
- ASML → price OK
- MC → price OK but symbol mapping likely incorrect (to fix later)
- PANX → unavailable on current plan (excluded for now)

### Critical Blocking Issue
Upsert into market_data_daily fails → NO DATA PERSISTENCE

### Root Cause Hypothesis (PRIORITIZED)
1. Missing or incorrect unique constraint on (asset_id, price_date)
2. Schema mismatch in market_data_daily
3. Deployed function ≠ latest local version (db_error not visible)

### Impact
- No historical data
- No performance calculation
- No scoring possible
- No decision engine possible

### HARD RULE
Do NOT proceed to:
- scoring
- dashboard improvements
- decision engine
UNTIL at least one asset returns status = "updated"

### Mandatory Next Step (EXECUTION ORDER)
1. Open Supabase → update-market-data → Code
2. Confirm presence of:
   db_error: upsertError?.message ?? null
3. Run SQL checks on market_data_daily:
   - columns
   - data types
   - indexes
4. Ensure existence of:
   UNIQUE (asset_id, price_date)
5. Fix table if needed
6. Re-run function test
7. Validate:
   → at least one "status": "updated"

### Known Constraints
- Twelve Data plan limits some assets (e.g., PANX)
- European tickers may require exchange mapping later

### Next Phase (LOCKED UNTIL FIX)
asset_scoring_v1 → opportunity ranking → CIO allocation

---
END
