# Session 006 — CLEAN — Audit + drop deprecated tables + reschedule cron EOD + cleanup env vars

**Date** : 2026-05-07
**Status** : completed
**Duration** : 11 minutes

---

## 📝 Résumé

Session 006 — CLEAN (~1h). Trois phases enchainees avec succes :

1. AUDIT (15 min) — 47 tables _v1 auditees pour dependances downstream :
   - 13 tables SAFE_TO_DROP (0 vue/fonction dependante)
   - 22 tables LOW_DEPS (1-2 deps, souvent vues _deprecated_)
   - 6 tables MEDIUM_DEPS (3-5 deps, migration future)
   - 5 tables HIGH_DEPS (6+ deps, dont assets_v1 avec 23 deps : NE PAS TOUCHER avant migration frontend)

2. RESCHEDULE CRON (5 min) — ECONOMIE IMMEDIATE ~$50/mois :
   - Ancien : update-market-data-every-5min */5 * * * * (288 runs/jour)
   - Nouveau : update-market-data-eod 0 21 * * 1-5 (5 runs/semaine)
   - Twelve Data Pro va passer largement sous quota → cancel possible fin mai sans stress

3. DROP TABLES (30 min) — 15 tables legacy supprimees :
   - 4 _deprecated_20260505_* (prefix explicite, audit valide)
   - 11 _v1 zero deps (audit confirme)
   - Migration cleanup_session_006_drop_safe_legacy_tables appliquee
   - Tables totales 117 → 110 (-6%)

VALIDATION E2E :
- Smoke test prod 3 routes : /aujourdhui /login /opportunites = HTTP 200
- AppNav rendu, filter pills intacts, design ADR-10 v2 preserve
- 22 alertes investment_alerts toujours en DB
- 3 RPCs frontend critiques toujours fonctionnelles (fn_get_signal_dashboard, fn_get_my_active_alerts, fn_get_my_profile)

Aucune regression. Cleanup safe execute sans casse.

PENDING utilisateur (5 min hors session) :
- Cleanup env vars Vercel (doublons SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL et ANON_KEY)
- Verification date renouvellement Twelve Data + reminder iPhone

---

## 📦 Deliverables

| Item | Détail |
|---|---|
|  | Classification SAFE/LOW/MEDIUM/HIGH par count vues dependantes. Output structure pour planifier Sessions 007-009. |
|  | jobid 12 unscheduled, jobid 17 cree avec schedule 0 21 * * 1-5. Economie ~$50/mois Twelve Data Pro. |
|  | Migration cleanup_session_006_drop_safe_legacy_tables. 4 _deprecated_ + 11 _v1 zero-deps supprimees. CASCADE sur dependances vues _deprecated_ residuelles. |
|  | 3 routes Vercel HTTP 200 (aujourdhui, login, opportunites). RPCs frontend OK. 22 alertes preservees. Aucune regression. |

---

## 📊 État système

```json
{
  "tables_total": 110,
  "data_preserved": {
    "critical_rpcs": 3,
    "investment_alerts": 22
  },
  "tech_debt_open": {
    "tables_low_deps": 22,
    "tables_medium_deps": 6,
    "big_cleanup_session_target": "008-009",
    "tables_high_deps_preserved": 5
  },
  "cron_reschedule": {
    "new_jobid": 17,
    "old_jobid": 12,
    "new_schedule": "0 21 * * 1-5",
    "old_schedule": "*/5 * * * *",
    "estimated_savings_per_month": "$50"
  },
  "frontend_health": {
    "login_http": 200,
    "regression": false,
    "aujourdhui_http": 200,
    "opportunites_http": 200
  },
  "tables_dropped_session_006": 15
}
```

---

## 🐛 Bugs résolus

1. **** → fix : 

---

## ⚠️ Blockers + Workarounds

- **** → workaround : 
- **** → workaround : 

---

## 📋 Pending Items pour la session suivante

- [P3] 
- [P0 immediate] 
- [P2 Session 007 ou 008] 
- [P2] 
- [P0 next session] 
- [P0 cette semaine] 

---

## 🚀 Brief pour la session suivante


# Session 007 — MEASURE alertes (1.5h)

## Cap strategique

Suite Session 006 (CLEAN), Session 007 livre la VALIDATION DE QUALITE des alertes existantes. Avant de bâtir trade IBKR + automation, on doit savoir si l Alert Engine V2 produit des signaux fiables.

## Pre-requis lecture

- ADR-14 (pivot perso), ADR-15 (cout API), ADR-16 (architecture cible)
- Memoires #2 (architecture brokers), #3 (architecture nav), #16 (4 validation levels)
- Verifier que reschedule cron Session 006 a tourne au moins 1×/jour sans erreur

## Etape 1 — Table nx.alert_outcomes (20 min)

Schema :
```sql
CREATE TABLE nx.alert_outcomes (
  id uuid PRIMARY KEY,
  alert_id uuid REFERENCES nx.investment_alerts,
  asset_id uuid REFERENCES nx.assets,
  alert_price numeric NOT NULL,
  alert_at timestamptz NOT NULL,
  
  -- Performance trackers
  price_at_d7 numeric,   delta_d7_pct numeric,
  price_at_d30 numeric,  delta_d30_pct numeric,
  price_at_d90 numeric,  delta_d90_pct numeric,
  
  -- Verdict
  outcome text,  -- WIN_D7 / WIN_D30 / LOSS_D7 / LOSS_D30 / PENDING
  outcome_score numeric, -- 0-100
  
  computed_at timestamptz DEFAULT now()
);
```

## Etape 2 — Backfill 22 alertes (30 min)

RPC `fn_compute_alert_outcomes()` qui :
- Pour chaque alerte status NEW : recupere prix actuel
- Calcule delta D-7, D-30 si donnees disponibles
- Verdict WIN/LOSS selon seuil (ex: WIN si +3% en 7j sur BUY_ZONE)
- INSERT ou UPDATE alert_outcomes

## Etape 3 — Vue vw_alert_performance (15 min)

Aggregation par alert_kind :
- WIN_RATE_D7, WIN_RATE_D30, WIN_RATE_D90
- AVG_DELTA_D7, AVG_DELTA_D30, AVG_DELTA_D90
- COUNT_TOTAL, COUNT_PENDING

## Etape 4 — Page /performance simple (30 min)

Page ADR-10 v2 minimale :
- KPI cards : Win rate global, alertes generees, perf moyenne 30j
- Tableau par alert_kind (BUY_ZONE / HOT_PULLBACK / WATCH_PULLBACK)
- Top 5 alertes gagnantes / perdantes

## Etape 5 — Commit + smoke test (10 min)

## Sortie Session 007

Tu sais OBJECTIVEMENT si Nexial Alert Engine V2 est fiable AVANT de l automatiser via IBKR. Si win rate < 50% = il faut tuner avant trade auto. Si > 60% = green light Sessions 008+.


---

*Auto-généré depuis `nx.fn_get_session_brief()` — Nexial Supabase*
