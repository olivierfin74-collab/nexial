# Session 005 — Phase A v2 — Bascule auth Magic Link → email+password + table user_profiles avec rôles + pseudo affiché

**Date** : 2026-05-06
**Status** : completed
**Duration** : 660 minutes

---

## 📝 Résumé

Session 005 — Marathon strategique ~9h. 3 livrables majeurs :

1. PHASE A v2 EN PROD (commit ~minuit) :
   - Bascule Magic Link → email+password classique (suite ADR-13 Session 004 bug UX cross-browser)
   - Systeme profile applicatif avec username + display_name + role admin/beta/paid/free
   - Migration DB public.profiles etendue (RLS users_read_own + admins_read_all)
   - RPC fn_get_my_profile() + trigger handle_new_user signup
   - Hook useUser enrichi (profile, isAdmin)
   - UI dropdown menu signOut dans AppNav (avec Preferences point d'entree)
   - Composant Preferences utilisateur migre vers fn_get_my_profile
   - Cleanup doublon : suppression src/app/app/logout-button.tsx legacy
   - Hash commit prod : a verifier dans terminal Olivier

2. PIVOT STRATEGIQUE MAJEUR (ADR-14) :
   - Abandon vision commerciale (50-200 utilisateurs payants 19-49 euros/mois)
   - Focus : Nexial = outil PERSONNEL ultra-performant pour piloter MES investissements
   - Architecture 5 piliers preservee (DCA + CTO + PEA + Alert + Consolidation)
   - Roadmap 6 sessions avant 1er juin 2026 (reprise job)
   - Option commercialiser future preservee mais non prioritaire

3. PLAN MIGRATION COUTS API (ADR-15) :
   - Audit revele cron toutes 5 min coupe → ~16k API calls/mois
   - Plan migration Twelve Data Pro $79/mois → Yahoo Finance gratuit (yfinance + screener)
   - Timeline alignee fin abonnement (mai 2026) → 1er juin 2026 = 100% gratuit
   - Economie ~$1000/an + capacite ajoutee (detection baisse brutale)

---

## 📦 Deliverables

| Item | Détail |
|---|---|
|  | public.profiles + username UNIQUE, display_name, role nx.user_role default free. RLS 3 policies. Profile Olivier admin. Trigger handle_new_user. RPC fn_get_my_profile(). |
|  | src/app/login/page.tsx — 2 inputs email+password + signInWithPassword + lien "Mot de passe oublie ?" → /reset-password. Design ADR-10 v2 strict. |
|  | src/app/reset-password/page.tsx CREEE — input email + resetPasswordForEmail avec redirectTo /update-password. |
|  | src/app/update-password/page.tsx CREEE — 2 inputs nouveau password + confirm, validation min 8 chars + identiques, updateUser({ password }). |
|  | src/hooks/useUser.ts — fetch profile via fn_get_my_profile au mount + onAuthStateChange. Return { user, profile, loading, signOut, isAdmin }. |
|  | src/types/nx.ts — UserRole enum + UserProfile interface. |
|  | src/components/layout/AppNav.tsx — clic avatar → dropdown menu Preferences + Deconnexion. Click outside ferme. Indicateur fleche bas. |
|  | Affichage PSEUDO/ROLE/EMAIL/USER ID lit desormais depuis profile. Plus de finet.o legacy. |
|  | src/app/app/logout-button.tsx SUPPRIME. Bouton "Se deconnecter" legacy retire de page /app. Source unique = dropdown header. |
|  | src/middleware.ts isAuthPage inclut /reset-password + /update-password. PUBLIC_PATHS = [/login, /reset-password, /update-password, /auth]. |
|  | 10 fichiers (+819/-239), 1 supprime, 2 crees, 7 modifies. Push GitHub OK. Vercel auto-deploy. 4 routes prod HTTP 200/307. |
|  | ID 019e0170-0f2a-7a20-9cc9-b2b72aa4a4c5 — Nexial = outil PERSONNEL, abandon vision commerciale, roadmap 6 sessions avant 1er juin. |
|  | ID 019e0170-f16d-78f4-ae51-0da92073a90e — Twelve Data Pro $79/mois → Yahoo Finance gratuit. Timeline mai-juin 2026. |
|  | Memoire #1 simplifiee (Olivier industriel horloger reprend job 1er juin). Memoire #23 pivot strategique perso. |

---

## 📊 État système

```json
{
  "db": {
    "rpcs_list": [
      "fn_get_signal_dashboard (anon+auth)",
      "fn_get_my_active_alerts (auth RLS)",
      "fn_get_my_profile (auth)"
    ],
    "views_total": 250,
    "tables_total": 117,
    "rpcs_consumed_by_frontend": 3
  },
  "auth": {
    "provider": "email_password",
    "role_enum": "nx.user_role (admin/beta/paid/free)",
    "olivier_role": "admin",
    "profile_table": "public.profiles",
    "trigger_signup": "handle_new_user active",
    "rpc_get_profile": "public.fn_get_my_profile()",
    "olivier_username": "olivier"
  },
  "repo": {
    "branch": "main",
    "working_tree": "clean",
    "phase_a_v2_pushed": true,
    "commits_session_005": 1
  },
  "cost_api": {
    "cancel_target": "fin mai 2026",
    "main_provider": "Twelve Data Pro $79",
    "migration_plan": "ADR-15",
    "target_monthly": "$0",
    "current_monthly": "$89"
  },
  "frontend": {
    "url_prod": "https://nexial-chi.vercel.app",
    "auth_method": "email_password",
    "profile_system": "active",
    "pages_live_prod": [
      "aujourdhui",
      "login",
      "opportunites",
      "app",
      "reset-password",
      "update-password"
    ]
  },
  "strategy": {
    "mode": "personal_tool",
    "adr_14_pivot": "019e0170-0f2a-7a20-9cc9-b2b72aa4a4c5",
    "job_resume_date": "2026-06-01",
    "adr_15_cost_migration": "019e0170-f16d-78f4-ae51-0da92073a90e",
    "commercial_optional_future": true,
    "roadmap_sessions_before_june_1st": 6
  },
  "cron_jobs": {
    "fx_refresh": {
      "status": "OK",
      "schedule": "0 19 * * *"
    },
    "alerts_pipeline_daily": {
      "status": "OK",
      "schedule": "0 19 * * 1-5"
    },
    "sync_session_to_github": {
      "status": "OK",
      "schedule": "on-demand"
    },
    "update_market_data_5min": {
      "status": "ACTIVE_TO_BE_CHANGED",
      "schedule": "*/5 * * * *",
      "cost_impact": "~16k API calls/mois Twelve Data Pro"
    }
  },
  "adrs_total": 15,
  "tech_debt_open": 11
}
```

---

## 🐛 Bugs résolus

1. **** → fix : 
2. **** → fix : 
3. **** → fix : 
4. **** → fix : 

---

## ⚠️ Blockers + Workarounds

- **** → workaround : 
- **** → workaround : 
- **** → workaround : 

---

## 📋 Pending Items pour la session suivante

- [P0 immediate] 
- [P1 urgent (semaine 12 mai)] 
- [P1] 
- [P1 (semaine 19 mai)] 
- [P2] 
- [P2] 
- [P2 (avant 1er juin)] 
- [P0 fin mai] 
- [P3 (Session 007)] 
- [P3] 
- [P3 Session 009] 

---

## 🚀 Brief pour la session suivante


# Session 006 — Brief propose

## Cap strategique

Apres pivot Session 005 (Nexial = outil personnel), Session 006 ouvre la phase d'execution operationnelle pour preparer l'autonomie complete avant 1er juin 2026.

## Priorite ABSOLUE — Capter les opportunites type AMD +16%

Olivier a constate Session 005 qu'il loupe des opportunites faute de surveillance. Telegram alert reactivation = priorite #1 absolue. Sans ca, Nexial echoue dans son use case principal.

## Etape 1 — Verification context (5 min au demarrage)

- Lire ADR-14 et ADR-15 (graves Session 005)
- Verifier que Vercel prod repond toujours OK
- Olivier verifie date renouvellement Twelve Data dashboard + cree reminder iPhone

## Etape 2 — Telegram alerts reactivation (45 min)

L'Edge Function send-watchlist-alert existe (Session 001). A reactiver :
- Verifier secret TELEGRAM_BOT_TOKEN + chat_id Olivier dans Edge Function env
- Verifier trigger sur insert nx.investment_alerts (ou creer si manquant)
- Format message : ticker + signal + zone + drawdown + lien direct app
- Test : insert manuel 1 alerte → reception Telegram iPhone validee

## Etape 3 — POC Yahoo scout day_losers (45 min)

Premier POC migration coute api :
- Creer Edge Function yahoo-scout-losers (Deno + fetch Yahoo screener API)
- Endpoint : query1.finance.yahoo.com/v1/finance/screener/predefined/saved?scrIds=day_losers
- Filtres Nexial : drawdown < -X%, market cap > 5B$, secteurs tech/healthcare/finance
- Action : si match nouveau ticker hors watchlist → alerte "OPPORTUNITY DETECTED"
- Test sur 1 cycle, validation manuelle resultats

## Etape 4 — Test E2E + commit (15 min)

- Trigger manuel Telegram alert → reception iPhone
- Trigger manuel yahoo-scout-losers → resultats Postgres + Telegram
- Si tout OK : commit "feat(alerts+scout): Telegram reactivation + Yahoo scout day_losers POC"

## Phase optionnelle si energie

### Modal Valider Ordre proto (1h)
Si energie restante : commencer la Modal complete avec sizing + slider allocation. Sinon Session 007.

## Pre-requis avant demarrage

- Vercel prod OK (curl https://nexial-chi.vercel.app/aujourdhui)
- Twelve Data dashboard accessible (date renouvellement)
- iPhone Olivier disponible pour test Telegram
- Lire ADR-14 et ADR-15 (Cap strategique + plan migration couts)


---

*Auto-généré depuis `nx.fn_get_session_brief()` — Nexial Supabase*
