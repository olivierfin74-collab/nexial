# Session 005 — Phase A v2 — Bascule auth Magic Link → email+password + table user_profiles avec rôles + pseudo affiché

**Date** : 2026-05-06
**Status** : completed
**Duration** : 690 minutes

---

## 📝 Résumé

Session 005 — Marathon stratégique 12h+. 3 livrables techniques majeurs + 3 ADRs structurants :

1. PHASE A v2 EN PROD (commit 2287ee7 puis amendement avec dropdown signOut + cleanup) :
   - Bascule Magic Link → email+password classique
   - Système profile applicatif avec username + role admin/beta/paid/free
   - Migration DB public.profiles + RLS + RPC fn_get_my_profile + trigger handle_new_user
   - Hook useUser enrichi (profile, isAdmin)
   - UI dropdown menu signOut dans AppNav
   - Composant Preferences migre vers fn_get_my_profile
   - Cleanup doublon : suppression bouton legacy /app
   - 10 fichiers, +819/-239 lignes

2. PIVOT STRATEGIQUE MAJEUR (ADR-14) :
   - Abandon vision commerciale → outil PERSONNEL ultra-performant
   - Architecture 5 piliers preservee
   - Roadmap 6 sessions avant 1er juin 2026
   - Option commercialisation future preservee mais non prioritaire

3. PLAN MIGRATION COUTS API (ADR-15) :
   - Audit revele cron 5min coupable ($79/mois Twelve Data Pro)
   - Plan migration Yahoo Finance gratuit
   - Timeline alignee fin abonnement (mai 2026) → 1er juin = 100% gratuit
   - Economie ~$1000/an + capacite ajoutee (detection baisse brutale)

4. ARCHITECTURE CIBLE COMPLETE (ADR-16, le plus important) :
   - 4 comptes brokers (PEA Boursorama, CTO TR, CTO IBKR principal, IBKR Sub-account)
   - CTO Boursorama A FERMER
   - 4 watchlists (PEA Long, CTO Long partagée TR/IBKR, TRADE exclusive Sub-account, DCA)
   - Nav 5 zones (Pilotage, Action, Surveillance, Intelligence, Admin caché)
   - Trade Plan unifie via Bracket Orders IBKR (1 validation = 0 friction après)
   - Sub-account IBKR = laboratoire informant compte principal
   - Roadmap raffinée 9 sessions (Sessions 006-014+)

---

## 📦 Deliverables

| Item | Détail |
|---|---|
|  | Commit Phase A v2 en prod : bascule email+password + profile + dropdown + cleanup. Hash commit ~Thu May 7 00:14:00 2026. |
|  | public.profiles étendue (username, display_name, role nx.user_role) + RLS 3 policies + RPC fn_get_my_profile + trigger handle_new_user. |
|  | ID 019e0170-0f2a-7a20-9cc9-b2b72aa4a4c5 — Nexial = outil PERSONNEL. |
|  | ID 019e0170-f16d-78f4-ae51-0da92073a90e — Twelve Data → Yahoo gratuit. |
|  | ID 019e018c-2fb0-73ed-9b9c-137f68fe4b93 — 4 comptes + 4 watchlists + nav 5 zones + Trade Plan unifié. |
|  | #1 contexte Olivier simplifié, #2 architecture brokers, #3 architecture nav, #16 4 validation levels, #23 pivot perso. |

---

## 📊 État système

```json
{
  "auth": {
    "olivier_role": "admin",
    "profile_system": "fn_get_my_profile + trigger active",
    "olivier_username": "olivier"
  },
  "roadmap": {
    "next_session": "Session 006 CLEAN",
    "job_resume_date": "2026-06-01",
    "sessions_before_june": 9
  },
  "cost_api": {
    "main_provider": "Twelve Data Pro $79",
    "current_monthly": "$89",
    "target_june_2026": "$0",
    "migration_plan_adr": "019e0170-f16d-78f4-ae51-0da92073a90e"
  },
  "frontend": {
    "url_prod": "https://nexial-chi.vercel.app",
    "auth_method": "email_password_complete",
    "pages_live_prod": 6
  },
  "cron_jobs": {
    "cost_impact": "~$50/mois economisable immediatement",
    "update_market_data_5min": "TO_BE_RESCHEDULED_SESSION_006"
  },
  "adrs_total": 16,
  "architecture": {
    "nav_zones": 5,
    "brokers_count": 4,
    "watchlists_count": 4,
    "adr_14_pivot_perso": "019e0170-0f2a-7a20-9cc9-b2b72aa4a4c5",
    "adr_15_cost_migration": "019e0170-f16d-78f4-ae51-0da92073a90e",
    "adr_16_target_architecture": "019e018c-2fb0-73ed-9b9c-137f68fe4b93"
  },
  "tech_debt_open": 11
}
```

---

## 🐛 Bugs résolus

1. **** → fix : 
2. **** → fix : 
3. **** → fix : 

---

## ⚠️ Blockers + Workarounds

- **** → workaround : 
- **** → workaround : 
- **** → workaround : 

---

## 📋 Pending Items pour la session suivante

- [P0 immediate] 
- [P0 cette semaine] 
- [P1] 
- [P0 immediate] 
- [P1] 
- [P1] 
- [P2] 
- [P2] 
- [P2] 
- [P2] 
- [P3] 
- [P3 (Sessions 014+)] 
- [P3] 

---

## 🚀 Brief pour la session suivante


# Session 006 — CLEAN (1.5h)

## Cap stratégique

Avant tout implémentation des nouvelles fonctionnalités (Telegram, Yahoo scout, Trade Plans), le système doit être PROPRE. Session 006 = CLEAN pur, pas de feature.

## Pré-requis lecture

Au démarrage Session 006 :
- Lire ADR-14 (pivot perso), ADR-15 (migration coûts), ADR-16 (architecture cible)
- Verifier que Vercel prod /aujourdhui répond OK
- Olivier confirme date renouvellement Twelve Data + reminder iPhone créé

## Etape 1 — Audit dépendances (15 min)

Identifier objets safe-to-drop :
- Lister 23 tables flagged _deprecated_*
- Audit downstream dependencies (zéro vue/fonction/route consomme)
- Confirmer absence d'utilisation dans frontend Next.js
- Lister Edge Functions inactives

## Etape 2 — Reschedule cron coûteux (5 min)

ACTION CRITIQUE pour économies immédiates :

```sql
SELECT cron.unschedule('update-market-data-every-5min');
SELECT cron.schedule(
  'update-market-data-eod',
  '0 21 * * 1-5',
  $$ SELECT nx.fn_invoke_update_market_data('pg_cron'); $$
);
```

Économie immédiate : ~$50/mois sur Twelve Data Pro (passage sous quota Pro).

## Etape 3 — DROP des tables sûres (30 min)

Migration `cleanup_session_006_deprecated_tables` :
- DROP des 23 tables _deprecated_* validées
- Préserver l'ENUM nx.user_role (déjà utilisé)
- Préserver toutes les tables core nx.*

## Etape 4 — Cleanup env vars Vercel (10 min)

- Identifier doublons SUPABASE_URL vs NEXT_PUBLIC_SUPABASE_URL
- Identifier doublons SUPABASE_ANON_KEY vs NEXT_PUBLIC_SUPABASE_ANON_KEY
- Cleanup côté dashboard Vercel

## Etape 5 — Commit + push (10 min)

- Pas de modif frontend (juste DB + cron)
- Commit message : "chore(cleanup): session 006 — drop deprecated tables + reschedule cron EOD"

## Etape 6 — Validation (10 min)

- Vercel prod toujours HTTP 200 (smoke test 4 routes)
- /aujourdhui charge toujours 18 SignalCards
- /opportunites charge toujours 22 alertes

## Sortie Session 006

Système propre + économie $50/mois activée + base saine pour Session 007 MEASURE.


---

*Auto-généré depuis `nx.fn_get_session_brief()` — Nexial Supabase*
