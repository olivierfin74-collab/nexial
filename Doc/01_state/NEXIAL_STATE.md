# NEXIAL_STATE

Last update: 2026-04-27

---

# 🚨 CURRENT STATE — DO NOT DRIFT (AUTHORITATIVE)

## Phase
Capital Redeployment Engine

## Current step
create `capital_redeployment_v2`

## Status
- System fully operational (data → decision → execution → alerts)
- Real portfolio installed (PEA + CTO)
- Watchlist validated
- Market data pipeline stable (Twelve Data, rate-limit safe)
- Cloud automation active (GitHub Actions)
- No active trades → correct (market above zones)

## Locked rules

### Capital management
- Never sell at a loss unless thesis is broken
- Always use available cash first
- If selling → prioritize profit-taking (winning positions)
- Reduce weak positions only near break-even (~ -3%)
- No forced rotation

### UX / Psychology
- Never present action as loss
- Always frame as capital optimization
- 1 alert = 1 action
- Silence = valid decision

### Strategy
- One optimized watchlist (no duplication)
- Risk managed via allocation (not selection)
- Discovery engine allowed but strict
- Watchlist changes only on clear improvement

## Locked next action
GO redeployment

Create:
`capital_redeployment_v2`

Objective:
- determine funding source for new opportunities
- use cash first
- then profits
- never force loss
- preserve user confidence

## Restart instruction (UNIQUE)

User says:
on reprend Nexial

Assistant must:
1. read CURRENT STATE
2. confirm phase: Capital Redeployment Engine
3. confirm step: create `capital_redeployment_v2`
4. say: No drift detected, proceeding with locked step
5. execute ONLY redeployment logic
6. do not revisit previous layers

END

---

# 📊 SYSTEM STATUS (VALIDATED LAYERS)

## Data
- assets_v1 complete (PEA + CTO)
- price_quotes_v1 stable
- Twelve Data integrated
- rate-limit handled (single-call mode)

## Portfolio
- user_positions_v1 → PEA + CTO loaded
- PRU correct
- asset_name normalized

## Watchlist
- watchlist_v1 defined (PEA + CTO)
- scoring V5 applied

## Market engine
- entry_zones_live_v2 validated
- multi-asset coverage OK

## Decision engine
- asset_scoring_live_v5 OK
- capital_routing_v1 OK
- position_sizing_v2 OK

## Execution engine
- execution_orders_v3 OK
- execution_order_lines_v1 OK
- execution_order_lines_v2 OK
- execution_order_lines_v3 OK

## Alert engine
- execution_order_alerts_v1 OK
- current result = 0 (correct)

## Cloud
- GitHub Actions OK
- secrets secured
- pipeline stable

---

# 📈 CURRENT MARKET ANALYSIS

## Observation
- All tracked assets above Z1
- Distance ≈ 5% minimum
- No pullback

## Nexial response
- WAIT
- PREPARE only
- No execution

## Interpretation
Correct behavior:
- no overtrading
- no emotional bias
- capital preserved

---

# 📊 WATCHLIST STRUCTURE

## PEA (core)
- WPEA
- Nasdaq PEA
- ASML
- Schneider Electric
- Air Liquide
- LVMH
- Hermès
- Saint-Gobain
- AXA
- TotalEnergies
- Capgemini
- Eurazeo
- Interparfums
- STIF

## CTO (core)
- MSFT
- META
- GOOGL
- AMZN
- NVDA
- AVGO
- TSM
- AMD
- CRWD
- MELI
- LLY
- VRTX
- ISRG
- UBER
- V

## CTO (opportunistic)
- ADBE
- SNOW
- PLTR
- NOVO.B
- SMH

---

# 🔍 DISCOVERY ENGINE

## Principle
- scan broader universe
- apply scoring V5
- filter score >= 8
- compare with weakest current asset

## Rules
- no frequent changes
- replacement only if superior
- no forced selling

## Owned asset case
- no forced replacement
- gradual redeployment instead

---

# ⚙️ CAPITAL LOGIC

## Actions
- BUY_NEW → new position
- REINFORCE → existing position
- WATCH → no action
- IGNORE → irrelevant

## Missing layer
capital redeployment (current focus)

---

# 📚 SESSION HISTORY

## Session update — 2026-04-26

### Completed
- GitHub repo created
- Cloud automation implemented
- Secrets configured
- Scoring V5 deployed
- Dashboard + equity curve
- Multi-user ready

### Behavior
- MSFT → PREPARE_BUY
- No BUY → correct

---

## Session update — 2026-04-25

### Context
Transition from technical engine to product (Invest Now)

### Frontend
- Next.js setup
- Invest Now UI
- single action UX
- tracking UI

### Backend
- Supabase connected
- execution_queue_v1
- anti-spam logic

### Data
- history + performance
- bug fixes

### DevOps
- Git setup
- first commit

### Result
- full flow working

---

# 🧠 PRODUCT PRINCIPLES

Nexial must prove value via:
- PRU improvement
- alpha vs DCA
- alpha vs benchmark
- avoided bad entries
- disciplined execution

---

# 🎯 FINAL STATE

Nexial is now:
- stable ✔
- disciplined ✔
- data-driven ✔
- capital-efficient ✔

Next step:

```text
CAPITAL REDEPLOYMENT ENGINE
```

---

## Session update — 2026-04-26

### Completed
- GitHub repo créé
- Pipeline GitHub Actions opérationnel
- Secrets configurés
- Automatisation cloud active (cron 30 min)
- Scoring V5 implémenté
- Invest router V2 OK
- Alert engine V5 OK
- Dashboard + equity curve OK

### Current behavior
- MSFT → PREPARE_BUY
- Z2 = 382$
- Aucun BUY (marché trop haut → comportement correct)

### Infra
- Nexial tourne en cloud sans machine locale
- Telegram connecté
- Multi-user OK

### Next
- Position sizing (capital allocation)
- Portfolio tracking réel
- IBKR integration (option)
- UX refinement

### Notes
- Système stable
- Pas de sur-trading
- Edge basé sur pullback confirmé

---

# 📌 HISTORICAL STRATEGY BLOCK (KEPT FOR CONTEXT)

## Phase actuelle (historique)
Nexial — passage du MVP fonctionnel vers moteur produit complet orienté performance.

## État validé (historique)
- MVP Invest Now fonctionnel
- Frontend opérationnel avec écran Invest Now
- Connexion Supabase OK
- Lecture de `vw_invest_now_engine_v1`
- Insertion dans `execution_queue_v1`
- Historique via `vw_invest_now_history_v1`
- Performance via `vw_invest_now_performance_v1`
- Anti-spam UI + DB
- Champ `mode` ajouté : `INVEST_NOW` / `EXPERT`
- Bug quantité corrigé
- Git installé
- GitHub / Vercel configurés
- Clé API mise à jour côté GitHub/Vercel
- Twelve Data API connectée (avant implémentation complète)

---

# 🔍 WATCHLIST & STRATEGY LOGIC

## Univers d’investissement verrouillé

- PEA : 10–12 actifs
- CTO : 12–15 actifs
- Total ≈ 25 actifs

Objectif :
- concentration
- efficacité capital
- précision des décisions

---

## Watchlist PEA

### Core
- WPEA
- Nasdaq PEA
- ASML
- Schneider Electric
- Air Liquide
- LVMH
- Hermès
- Saint-Gobain
- AXA
- TotalEnergies

### Secondaire
- Capgemini
- STIF
- Eurazeo
- Interparfums

---

## Watchlist CTO

### Core
- MSFT
- META
- GOOGL
- AMZN
- NVDA
- AVGO
- TSM
- AMD
- CRWD
- MELI
- LLY
- VRTX
- ISRG
- UBER
- V

### Opportuniste
- ADBE
- SNOW
- PLTR
- NOVO.B
- SMH

---

## Règles d’entrée watchlist

- qualité élevée
- croissance forte
- momentum valide
- valorisation exploitable
- meilleure que l’existant

Décision :
- faible → rejet
- bon mais pas meilleur → rejet
- excellent mais cher → watch
- exceptionnel → possible entrée

---

## Portefeuille utilisateur

Nexial part de :
- positions réelles
- PRU
- quantité
- historique
- allocation
- devises

---

## Cas gérés

### 1. Actif détenu + watchlist
→ conserver / renforcer / alléger / attendre

### 2. Actif détenu hors watchlist
→ analyser / surveiller / arbitrer

### 3. Actif watchlist non détenu
→ surveiller / définir zone / déclencher ordre

---

## Performance Nexial vs DCA

Comparer :

### DCA
- achat automatique
- pas de timing

### Nexial
- achat piloté
- optimisation du timing
- réallocation intelligente

---

## KPI Nexial

- PRU optimisé
- alpha vs DCA
- alpha vs marché
- taux d’achat en zone
- capital évité
- performance des décisions

---

## ⚠️ NOTE IMPORTANTE

Ancien step :

GO PRICE ENGINE → DONE

Ne plus utiliser.

---

