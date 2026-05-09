# Nexial — Inventaire des éléments interactifs
> Phase A de la finalisation Mobile + Desktop. Référence pour les sessions
> de câblage backend. Mis à jour à chaque session.

**Snapshot Supabase de référence** : 063c40a9-8246-49eb-bd04-497a11d2bb14
**Date d'inventaire initial** : 2026-05-09
**Source mobile** : nexial-app-complete.jsx (1429 lignes, sha256 1a16b71989639e58415984dc20050c1c616b2a9ee9bda11d1a535b40198fb524)
**Source desktop** : nexial-desktop-complete.jsx (3171 lignes, sha256 f6adfc3a27c31cf04e00a5f7ed6aab6612ed0c78a4d9c5b77b645a8bc92e66f3)

---

## 1. Synthèse globale

| Métrique                          | Mobile | Desktop | Total |
|-----------------------------------|-------:|--------:|------:|
| Total éléments interactifs        |     59 |      88 |   147 |
| ✅ LIVE                           |      0 |       0 |     0 |
| 🟡 MOCK                           |     14 |      27 |    41 |
| 🔴 NONE                           |      0 |       0 |     0 |
| 🔵 UI (légitimement non backend)  |     45 |      61 |   106 |
| ⚠️ FINANCIAL                      |     12 |      18 |    30 |
| 🛡️ SYSTEM                         |      0 |      19 |    19 |
| 📝 DATA                           |      2 |       4 |     6 |
| 🎨 UI                             |     45 |      47 |    92 |
| Duplicatas mobile↔desktop         |   —    |    —    |    36 |

Note : tous les éléments sont actuellement mock (handler React local + mock data inlinés). La colonne LIVE est à 0 en attendant le câblage backend. NONE = 0 car même les boutons sans onClick visible ont au minimum un comportement implicite (cursor:pointer + style hover) — classifiés MOCK avec note explicite quand le handler manque.

---

## 2. Backend à créer (déduplication)

Liste consolidée des ressources backend uniques nécessaires pour câbler tout l'inventaire, sans doublon.

### 2.1 RPC à créer

- `nx.fn_validate_paper_orders(payload jsonb)` — valide N paliers paper trading en une transaction
  - Utilisée par : MOB-AST-002, DESK-TDY-009, DESK-TDY-013, DESK-TDY-017, DESK-ORD-002, DESK-ORD-007, DESK-AST-006
- `nx.fn_modify_paper_order(order_id uuid, updates jsonb)` — modif limit/qty/expires d'un palier
  - Utilisée par : MOB-AST-003, DESK-ORD-003, DESK-ORD-008
- `nx.fn_cancel_paper_order(order_id uuid, reason text)` — annule un palier paper
  - Utilisée par : DESK-ORD-004, DESK-ORD-009
- `nx.fn_postpone_action(action_id uuid, postpone_days int)` — reporte une action du jour
  - Utilisée par : MOB-AST-004, DESK-TDY-011, DESK-TDY-015, DESK-TDY-019, DESK-AST-008
- `nx.fn_dismiss_alert(alert_id uuid)` — passe une alerte en dismissed
  - Utilisée par : DESK-TDY-022 (sur click row alerte si on veut affordance dismiss)
- `nx.fn_mark_notifications_read(user_id uuid)` — vide le badge notifications
  - Utilisée par : MOB-TAB-001, DESK-NAV-007
- `nx.fn_set_account_mode(account_id uuid, mode text)` — change MANUAL_ONLY/SEMI_AUTO/FULL_AUTO
  - Utilisée par : DESK-DEV-029 → 032 (cards comptes brokers, à câbler comme cliquables)
- `nx.fn_force_run_cron(cron_name text)` — déclenche un cron manuellement
  - Utilisée par : DESK-DEV-002 → 015 (lignes cron à câbler avec retry)
- `nx.fn_telegram_resend_alert(alert_id uuid)` — renvoie une alerte Telegram
  - Utilisée par : DESK-DEV-021 → 025 (lignes recent telegram à câbler avec resend)
- `nx.fn_audit_rls()` — lance audit RLS sur les 61 tables
  - Utilisée par : DESK-DEV-035 (à câbler comme bouton "lancer audit" dans Sécurité)
- `nx.fn_eodhd_cutover()` — passe shadow_mode → live (migration EODHD)
  - Utilisée par : DESK-DEV-036 (à câbler comme bouton "Cutover" dans Migration data provider)
- `nx.fn_eodhd_rollback()` — retour TD Pro
  - Utilisée par : DESK-DEV-037 (idem rollback)

### 2.2 RPC existantes à réutiliser

- `nx.fn_get_opportunities_dashboard(p_user_id, p_min_score, p_event_kinds, p_actions)` — alimentation Aujourd'hui/Watchlist
  - Utilisée par : MOB-TDY-data, DESK-TDY-data, MOB-WCH-data, DESK-WCH-data
- `nx.fn_get_v3_monitor_dashboard(window_days)` — alimentation Dev/Admin KPIs
  - Utilisée par : DESK-DEV-data
- `fn_run_mobile_notification_engine_v1` — déjà câblé dans `pages.tsx` legacy mobile (vue alternative)
- `fn_mark_alert_seen_v1` — idem

### 2.3 Vues à brancher

- `vw_alerts_active_v1` — flux alertes pour /aujourdhui mobile + desktop
- `vw_execution_orders_ui_v1` — flux ordres pour /orders
- `vw_signal_complete_v3` — fiche détail asset (score combiné, sub-scores, indicateurs)
- `vw_patrimoine_global_v2` — KPIs patrimoine (Tableau)
- `vw_positions` (ou `nx.v_positions`) — positions Portefeuille
- `vw_watchlist_v1` — univers surveillé
- `vw_indices_eod` — indices CAC/SP/Nasdaq/VIX du Tableau et Aujourd'hui
- `vw_movers_top` — Top contributeurs/Détracteurs
- `vw_horizon_events` — calendrier (sidebar Hero éditorial)
- `vw_dev_pipeline_health` — section Dev KPIs Pipeline
- `vw_dev_crons_status` — table 14 crons
- `vw_dev_telegram_dispatch` — panel Telegram
- `vw_dev_alerts_today_metrics` — counters générées/envoyées/dismissed/J+1/J+5
- `vw_dev_accounts_modes` — 4 cards comptes brokers
- `vw_dev_security_audit` — RLS bypass/blocked roles
- `vw_dev_eodhd_progress` — barre de progression migration

### 2.4 Tables à créer

- `nx.order_override_log` — audit log validation/modif/annulation paper orders (qui, quand, palette before/after)
- `nx.action_postpone_log` — historique reports d'actions
- `nx.notifications_read_state` — état lu/non-lu par user (pour le badge cloche)
- `nx.cron_manual_runs` — log des forçages crons depuis l'UI Dev
- `nx.account_mode_change_log` — audit changements mode compte broker (FULL_AUTO etc.)

### 2.5 Route handlers Next.js à créer

- `POST /api/orders/validate` → wrap fn_validate_paper_orders
- `POST /api/orders/modify` → wrap fn_modify_paper_order
- `POST /api/orders/cancel` → wrap fn_cancel_paper_order
- `POST /api/actions/postpone` → wrap fn_postpone_action
- `POST /api/alerts/dismiss` → existe déjà (`src/app/api/alerts/dismiss/route.ts`) → vérifier signature avec fn_dismiss_alert
- `POST /api/notifications/mark-read` → wrap fn_mark_notifications_read
- `POST /api/admin/account-mode` → wrap fn_set_account_mode (gate role admin)
- `POST /api/admin/cron-run` → wrap fn_force_run_cron (gate role admin)
- `POST /api/admin/telegram-resend` → wrap fn_telegram_resend_alert
- `POST /api/admin/rls-audit` → wrap fn_audit_rls
- `POST /api/admin/eodhd-cutover` → wrap fn_eodhd_cutover
- `POST /api/admin/eodhd-rollback` → wrap fn_eodhd_rollback

---

## 3. Inventaire détaillé — Mobile

### 3.1 Page Tableau (Dashboard)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-TAB-001 | DashboardHeader | [icon: Bell] Notifications | 🟡 MOCK | 📝 DATA | Ouvrir liste notifications + marquer lues | RPC NEW: nx.fn_mark_notifications_read + view: vw_notifications_user | { user_id } | Vide badge dot rouge | DESK-NAV-007 | Aucun onClick côté mobile actuellement. Badge dot statique |
| MOB-TAB-002 | SectionToDoToday — Card ISRG | Card cliquable (zone entière) | 🔵 UI | 🎨 UI | Naviguer vers détail asset ISRG | — | — | Affiche AssetDetailPage(ticker=ISRG) | DESK-TDY-006 | onClick → onAssetClick("ISRG") via setDetailTicker |
| MOB-TAB-003 | SectionToDoToday — Card OR | Card cliquable | 🔵 UI | 🎨 UI | Naviguer vers détail OR | — | — | AssetDetailPage(OR) | DESK-TDY-014 | idem ActionCard |
| MOB-TAB-004 | SectionToDoToday — Card AI | Card cliquable | 🔵 UI | 🎨 UI | Naviguer vers détail AI | — | — | AssetDetailPage(AI) | DESK-TDY-018 | idem |
| MOB-TAB-005 | YourMoney — Cash panel | Bandeau "Déployer" cash dispo | 🔵 UI | 🎨 UI | (Probable navigation vers action déployer cash) | — | — | À spécifier | — | cursor:pointer mais aucun onClick attaché. Intent UI implicite |
| MOB-TAB-006 | YourMoney — Compte PEA | Row PEA Boursobank | 🔵 UI | 🎨 UI | Drill-down compte PEA | — | — | (À spécifier — onAccountClick prop existe mais non câblée à AppRoot) | — | Composant accepte onAccountClick mais YourMoney est appelé sans cette prop dans DashboardPage |
| MOB-TAB-007 | YourMoney — Compte CTO IBKR | Row CTO IBKR | 🔵 UI | 🎨 UI | Drill-down compte IBKR | — | — | idem | — | idem |
| MOB-TAB-008 | YourMoney — Compte CTO TR | Row CTO Trade Republic | 🔵 UI | 🎨 UI | Drill-down compte TR | — | — | idem | — | idem |
| MOB-TAB-009 | Timeline | Bouton "Tout voir" + ChevronRight | 🟡 MOCK | 🎨 UI | Naviguer vers timeline complète | — | — | À spécifier (probablement /timeline ou panel) | — | onClick absent, button stylé seul |

### 3.2 Page Aujourd'hui (Today)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-TDY-001 | FilterChips | "Toutes" | 🔵 UI | 🎨 UI | setFilter("all") | — | — | Re-render liste filtrée | DESK-TDY-022* | filtre client-side via useMemo |
| MOB-TDY-002 | FilterChips | "Chutes" | 🔵 UI | 🎨 UI | setFilter("flash") | — | — | idem | — | filtre kind=FLASH_DROP |
| MOB-TDY-003 | FilterChips | "Tensions" | 🔵 UI | 🎨 UI | setFilter("overbought") | — | — | idem | — | filtre kind=OVERBOUGHT_* |
| MOB-TDY-004 | AlertRow MELI | Row MELI cliquable | 🔵 UI | 🎨 UI | Naviguer vers détail MELI | — | — | AssetDetailPage(MELI) | DESK-TDY-022 | onClick → onAssetClick(ticker) |
| MOB-TDY-005 | AlertRow CRWD | Row CRWD | 🔵 UI | 🎨 UI | Détail CRWD | — | — | idem | — | idem |
| MOB-TDY-006 | AlertRow PANX | Row PANX | 🔵 UI | 🎨 UI | Détail PANX | — | — | idem | — | idem |
| MOB-TDY-007 | AlertRow NVDA | Row NVDA | 🔵 UI | 🎨 UI | Détail NVDA | — | — | idem | — | idem |
| MOB-TDY-008 | AlertRow SNOW | Row SNOW | 🔵 UI | 🎨 UI | Détail SNOW | — | — | idem | — | idem |
| MOB-TDY-009 | AlertRow RF | Row RF | 🔵 UI | 🎨 UI | Détail RF | — | — | idem | — | idem |
| MOB-TDY-010 | AlertRow ALSTI | Row ALSTI | 🔵 UI | 🎨 UI | Détail ALSTI | — | — | idem | — | idem |
| MOB-TDY-011 | AlertRow MC | Row MC | 🔵 UI | 🎨 UI | Détail MC | — | — | idem | — | idem |

### 3.3 Page Ordres

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-ORD-001 | FilterChips | "En attente" | 🔵 UI | 🎨 UI | setFilter("pending") | — | — | Re-render | — | local state |
| MOB-ORD-002 | FilterChips | "Exécutés" | 🔵 UI | 🎨 UI | setFilter("filled") | — | — | (Liste vide, count=0) | — | bouton actif mais aucune donnée associée |
| MOB-ORD-003 | FilterChips | "Expirés" | 🔵 UI | 🎨 UI | setFilter("expired") | — | — | idem | — | idem |
| MOB-ORD-004 | Group ISRG header | Row ticker ISRG | 🔵 UI | 🎨 UI | Détail ISRG | — | — | AssetDetailPage(ISRG) | — | onClick → onAssetClick("ISRG"), aussi visible flèche ChevronRight |
| MOB-ORD-005 | Group ISRG palier 1 | Row palier 1 ISRG | 🔵 UI | 🎨 UI | Détail asset ISRG (pas modal de modif) | — | — | AssetDetailPage(ISRG) | — | OrderRow.onClick={() => onAssetClick(o.ticker)} : pas d'action sur l'ordre lui-même côté mobile |
| MOB-ORD-006 | Group ISRG palier 2 | Row palier 2 ISRG | 🔵 UI | 🎨 UI | idem | — | — | idem | — | idem |
| MOB-ORD-007 | Group ISRG palier 3 | Row palier 3 ISRG | 🔵 UI | 🎨 UI | idem | — | — | idem | — | idem |
| MOB-ORD-008 | Group OR header | Row ticker OR | 🔵 UI | 🎨 UI | Détail OR | — | — | AssetDetailPage(OR) | — | idem |
| MOB-ORD-009 | Group OR palier 1 | Row palier 1 OR | 🔵 UI | 🎨 UI | Détail OR | — | — | idem | — | idem |
| MOB-ORD-010 | Group OR palier 2 | Row palier 2 OR | 🔵 UI | 🎨 UI | Détail OR | — | — | idem | — | idem |
| MOB-ORD-011 | Group OR palier 3 | Row palier 3 OR | 🔵 UI | 🎨 UI | Détail OR | — | — | idem | — | idem |

### 3.4 Page Portefeuille

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-PRT-001 | SegmentedControl | [icon: List] Liste | 🔵 UI | 🎨 UI | setViewMode("list") | — | — | Re-render | DESK-PRT-001 | toggle vue |
| MOB-PRT-002 | SegmentedControl | [icon: LayoutGrid] Cartes | 🔵 UI | 🎨 UI | setViewMode("card") | — | — | idem | DESK-PRT-002 | toggle vue |
| MOB-PRT-003 | FilterChip | "Tous" | 🔵 UI | 🎨 UI | setAccount("all") | — | — | Re-render filtré | DESK-PRT-003 | |
| MOB-PRT-004 | FilterChip | "PEA" | 🔵 UI | 🎨 UI | setAccount("PEA") | — | — | idem | DESK-PRT-004 | |
| MOB-PRT-005 | FilterChip | "CTO IBKR" | 🔵 UI | 🎨 UI | setAccount("CTO IBKR") | — | — | idem | DESK-PRT-005 | |
| MOB-PRT-006 | FilterChip | "CTO Trade Republic" | 🔵 UI | 🎨 UI | setAccount("CTO Trade Republic") | — | — | idem | DESK-PRT-006 | |
| MOB-PRT-007 | PositionRow ASML | Row ASML | 🔵 UI | 🎨 UI | Détail ASML | — | — | AssetDetailPage | DESK-PRT-007 | |
| MOB-PRT-008 | PositionRow MC | Row MC | 🔵 UI | 🎨 UI | Détail MC | — | — | idem | DESK-PRT-008 | |
| MOB-PRT-009 | PositionRow AI | Row AI | 🔵 UI | 🎨 UI | Détail AI | — | — | idem | DESK-PRT-009 | |
| MOB-PRT-010 | PositionRow RMS | Row RMS | 🔵 UI | 🎨 UI | Détail RMS | — | — | idem | DESK-PRT-010 | |
| MOB-PRT-011 | PositionRow SU | Row SU | 🔵 UI | 🎨 UI | Détail SU | — | — | idem | DESK-PRT-011 | |
| MOB-PRT-012 | PositionRow PANX | Row PANX | 🔵 UI | 🎨 UI | Détail PANX | — | — | idem | DESK-PRT-012 | |
| MOB-PRT-013 | PositionRow WPEA | Row WPEA | 🔵 UI | 🎨 UI | Détail WPEA | — | — | idem | DESK-PRT-013 | |
| MOB-PRT-014 | PositionRow ALSTI | Row ALSTI | 🔵 UI | 🎨 UI | Détail ALSTI | — | — | idem | — | mobile a 8 positions: ASML/MC/AI/RMS/SU/PANX/WPEA/ALSTI ; desktop a NVDA à la place de ALSTI → divergence mock |

### 3.5 Page Watchlist

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-WCH-001 | SegmentedControl | [icon: List] | 🔵 UI | 🎨 UI | setViewMode("list") | — | — | Re-render | DESK-WCH-001 | |
| MOB-WCH-002 | SegmentedControl | [icon: LayoutGrid] | 🔵 UI | 🎨 UI | setViewMode("card") | — | — | idem | DESK-WCH-002 | |
| MOB-WCH-003 | FilterChip | "Tous" | 🔵 UI | 🎨 UI | setFilter("all") | — | — | idem | DESK-WCH-003 | |
| MOB-WCH-004 | FilterChip | "Opportunités" | 🔵 UI | 🎨 UI | setFilter("opportunities") | — | — | idem | DESK-WCH-004 | filtre opp/borderline |
| MOB-WCH-005 | FilterChip | "Détenus" | 🔵 UI | 🎨 UI | setFilter("held") | — | — | idem | DESK-WCH-005 | |
| MOB-WCH-006 | FilterChip | "Ultra premium" | 🔵 UI | 🎨 UI | setFilter("ultra") | — | — | idem | DESK-WCH-006 | |
| MOB-WCH-007 | WatchlistRow AI | Row AI | 🔵 UI | 🎨 UI | Détail AI | — | — | idem | — | |
| MOB-WCH-008 | WatchlistRow TTE | Row TTE | 🔵 UI | 🎨 UI | Détail TTE | — | — | idem | — | présent uniquement mobile (desktop n'a pas TTE) |
| MOB-WCH-009 | WatchlistRow META | Row META | 🔵 UI | 🎨 UI | Détail META | — | — | idem | — | mobile only |
| MOB-WCH-010 | WatchlistRow OR | Row OR | 🔵 UI | 🎨 UI | Détail OR | — | — | idem | DESK-WCH-008 | |
| MOB-WCH-011 | WatchlistRow ISRG | Row ISRG | 🔵 UI | 🎨 UI | Détail ISRG | — | — | idem | DESK-WCH-007 | |
| MOB-WCH-012 | WatchlistRow ADYEN | Row ADYEN | 🔵 UI | 🎨 UI | Détail ADYEN | — | — | idem | — | mobile only |
| MOB-WCH-013 | WatchlistRow PRX | Row PRX | 🔵 UI | 🎨 UI | Détail PRX | — | — | idem | — | mobile only |
| MOB-WCH-014 | WatchlistRow V | Row V (Visa) | 🔵 UI | 🎨 UI | Détail V | — | — | idem | — | mobile only |
| MOB-WCH-015 | WatchlistRow AVGO | Row AVGO | 🔵 UI | 🎨 UI | Détail AVGO | — | — | idem | — | mobile only |
| MOB-WCH-016 | WatchlistRow MSFT | Row MSFT | 🔵 UI | 🎨 UI | Détail MSFT | — | — | idem | — | mobile only |

### 3.6 Page Détail Asset (asset detail)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-AST-001 | DetailHeader | [icon: ArrowLeft] Retour | 🔵 UI | 🎨 UI | Fermer détail / setDetailTicker(null) | — | — | Retour à la page courante | DESK-AST-001 | onBack callback |
| MOB-AST-002 | DetailActions | "Valider les 3 ordres" + ArrowUpRight | 🟡 MOCK | ⚠️ FINANCIAL | Insérer 3 paliers paper en base + audit log | RPC NEW: nx.fn_validate_paper_orders | { ticker, paliers:[{rank,price,qty,weight}], expires_at } | Toast success + refresh ordres + close | DESK-TDY-009/013/017, DESK-ORD-002/007, DESK-AST-006 | bouton sans onClick — purement présentationnel actuellement |
| MOB-AST-003 | DetailActions | "Modifier" | 🟡 MOCK | ⚠️ FINANCIAL | Ouvrir modal modif paliers/limit/qty | RPC NEW: nx.fn_modify_paper_order | { order_id, updates } | Modal open puis refresh | DESK-ORD-003, DESK-AST-007 | sans onClick |
| MOB-AST-004 | DetailActions | "Reporter" | 🟡 MOCK | 📝 DATA | Reporter action de N jours | RPC NEW: nx.fn_postpone_action | { action_id, days } | Toast + retire de la liste du jour | DESK-AST-008 | sans onClick |
| MOB-AST-005 | TechIndicators | Toggle "Indicateurs techniques" + ChevronDown | 🔵 UI | 🎨 UI | setOpen(!open) (expand collapse) | — | — | Affiche grid 6 stats | — | accordion local |

### 3.7 Page Navigation (BottomNav)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| MOB-NAV-001 | BottomNav | [icon: Home] Tableau | 🔵 UI | 🎨 UI | setCurrentPage("dashboard") | — | — | Render DashboardPage | DESK-NAV-001 | |
| MOB-NAV-002 | BottomNav | [icon: Sparkles] Aujourd'hui | 🔵 UI | 🎨 UI | setCurrentPage("today") | — | — | Render TodayPage | DESK-NAV-002 | |
| MOB-NAV-003 | BottomNav | [icon: ListChecks] Ordres | 🔵 UI | 🎨 UI | setCurrentPage("orders") | — | — | Render OrdersPage | DESK-NAV-003 | |
| MOB-NAV-004 | BottomNav | [icon: Briefcase] Portefeuille | 🔵 UI | 🎨 UI | setCurrentPage("portfolio") | — | — | Render PortfolioPage | DESK-NAV-004 | |
| MOB-NAV-005 | BottomNav | [icon: Eye] Watchlist | 🔵 UI | 🎨 UI | setCurrentPage("watchlist") | — | — | Render WatchlistPage | DESK-NAV-005 | |

---

## 4. Inventaire détaillé — Desktop

### 4.1 Page Tableau

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-TAB-001 | TableauPage | (page atterrissage uniquement, pas de boutons spécifiques au-delà de TopNav) | 🔵 UI | 🎨 UI | — | view: vw_patrimoine_global_v2 | — | Affichage KPIs+comptes+timeline | — | Tableau est en read-only — pas de CTAs ; Top contributeurs/Détracteurs sont des rows non cliquables (divergence avec Watchlist) |

> Note : la page Tableau n'expose **aucun bouton interactif au-delà de la navigation et des éléments hover**. Les rows Top contributeurs/Détracteurs (TableauPage et SectionMovers) ne sont pas cliquables — divergence vs Portefeuille où ils le sont. Pas d'IDs séquentiels à attribuer.

### 4.2 Page Aujourd'hui (cockpit éditorial)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-TDY-001 | HeroEditorial — Calendrier 11 mai | Item calendrier "Reprise pipeline" | 🔵 UI | 🎨 UI | (Read-only display) | view: vw_horizon_events | — | — | — | Pas cliquable, juste affichage |
| DESK-TDY-002 | HeroEditorial — Calendrier 13 mai | "J+5 outcomes" | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |
| DESK-TDY-003 | HeroEditorial — Calendrier 22 mai | "Expirations GTC" | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |
| DESK-TDY-004 | HeroEditorial — Calendrier 1 juin | "Reprise salariat" | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |
| DESK-TDY-005 | SectionContext — Index CAC 40 | Card CAC 40 | 🔵 UI | 🎨 UI | (Affichage) | view: vw_indices_eod | — | — | — | Non cliquable actuellement |
| DESK-TDY-006 | SectionContext — Index S&P 500 | Card S&P 500 | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |
| DESK-TDY-007 | SectionContext — Index Nasdaq | Card Nasdaq | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |
| DESK-TDY-008 | SectionContext — Index VIX | Card VIX | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |
| DESK-TDY-009 | ActionArticle ISRG | "Valider · ordre limite $446" + ArrowUpRight | 🟡 MOCK | ⚠️ FINANCIAL | Valider 3 paliers paper ISRG | RPC NEW: nx.fn_validate_paper_orders | { ticker:"ISRG", paliers:[...], expires_at } | Toast + refresh /orders + redirect option | MOB-AST-002, DESK-AST-006, DESK-ORD-002 | bouton sans onClick |
| DESK-TDY-010 | ActionArticle ISRG | "Détails ↗" | 🟡 MOCK | 🎨 UI | Naviguer vers détail asset ISRG | — | — | AssetDetailPage(ISRG) | DESK-PRT-007, DESK-WCH-007 | sans onClick mais intent UI clair |
| DESK-TDY-011 | ActionArticle ISRG | "Reporter" | 🟡 MOCK | 📝 DATA | Reporter action ISRG | RPC NEW: nx.fn_postpone_action | { action_id, days } | Toast + retire de la liste | MOB-AST-004 | sans onClick |
| DESK-TDY-012 | ActionArticle OR.PA | "Valider · ordre limite €359" | 🟡 MOCK | ⚠️ FINANCIAL | Valider paliers OR.PA | RPC NEW: nx.fn_validate_paper_orders | idem ticker OR.PA | idem | MOB-AST-002 | sans onClick |
| DESK-TDY-013 | ActionArticle OR.PA | "Détails ↗" | 🟡 MOCK | 🎨 UI | Détail OR.PA | — | — | AssetDetailPage | — | sans onClick |
| DESK-TDY-014 | ActionArticle OR.PA | "Reporter" | 🟡 MOCK | 📝 DATA | Reporter | RPC NEW: nx.fn_postpone_action | — | — | — | sans onClick |
| DESK-TDY-015 | ActionArticle AI.PA | "Valider · ordre limite €168" | 🟡 MOCK | ⚠️ FINANCIAL | Valider paliers AI.PA | RPC NEW: nx.fn_validate_paper_orders | idem ticker AI.PA | idem | MOB-AST-002 | rang "Watch" + "P1" — cas particulier 2 paliers (vs 3) |
| DESK-TDY-016 | ActionArticle AI.PA | "Détails ↗" | 🟡 MOCK | 🎨 UI | Détail AI.PA | — | — | idem | — | sans onClick |
| DESK-TDY-017 | ActionArticle AI.PA | "Reporter" | 🟡 MOCK | 📝 DATA | Reporter | RPC NEW: nx.fn_postpone_action | — | — | — | sans onClick |
| DESK-TDY-018 | SectionAlerts — Alerte MELI | Row + ChevronRight | 🔵 UI | 🎨 UI | (Probable navigation détail) | view: vw_alerts_active_v1 | — | À spécifier | MOB-TDY-004 | row non cliquable actuellement, ChevronRight présent mais sans onClick |
| DESK-TDY-019 | SectionAlerts — Alerte CRWD | Row | 🔵 UI | 🎨 UI | idem | idem | — | — | MOB-TDY-005 | idem |
| DESK-TDY-020 | SectionAlerts — Alerte NVDA | Row | 🔵 UI | 🎨 UI | idem | idem | — | — | MOB-TDY-007 | idem |
| DESK-TDY-021 | SectionAlerts — Alerte PANX | Row | 🔵 UI | 🎨 UI | idem | idem | — | — | MOB-TDY-006 | idem |
| DESK-TDY-022 | SectionAlerts — Alerte AI | Row | 🔵 UI | 🎨 UI | idem | idem | — | — | — | idem |

### 4.3 Page Ordres

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-ORD-001 | OrderArticle ISRG | (article entier non cliquable) | 🔵 UI | 🎨 UI | — | view: vw_execution_orders_ui_v1 | — | — | — | wrapper non interactif |
| DESK-ORD-002 | OrderArticle ISRG | "Valider les 3 paliers" + ArrowUpRight | 🟡 MOCK | ⚠️ FINANCIAL | Valider 3 paliers paper ISRG | RPC NEW: nx.fn_validate_paper_orders | { ticker, paliers, expires_at } | Toast + refresh + paliers passent en EXECUTED | MOB-AST-002, DESK-TDY-009, DESK-AST-006 | sans onClick |
| DESK-ORD-003 | OrderArticle ISRG | "Modifier" | 🟡 MOCK | ⚠️ FINANCIAL | Ouvrir modal modif paliers ISRG | RPC NEW: nx.fn_modify_paper_order | { order_id, updates } | Modal puis refresh | MOB-AST-003 | sans onClick |
| DESK-ORD-004 | OrderArticle ISRG | "Annuler" (rouge burgundy) | 🟡 MOCK | ⚠️ FINANCIAL | Annuler tous les paliers ISRG | RPC NEW: nx.fn_cancel_paper_order | { order_ids:[...], reason? } | Confirm dialog → toast | — | sans onClick ; bouton spécifique desktop (mobile n'a pas d'annulation) |
| DESK-ORD-005 | OrderArticle ISRG | Row palier P1 | 🔵 UI | 🎨 UI | (Affichage palier) | — | — | — | — | non cliquable |
| DESK-ORD-006 | OrderArticle ISRG | Row palier P2 | 🔵 UI | 🎨 UI | idem | — | — | — | — | idem |
| DESK-ORD-007 | OrderArticle OR.PA | "Valider les 3 paliers" | 🟡 MOCK | ⚠️ FINANCIAL | Valider 3 paliers paper OR.PA | RPC NEW: nx.fn_validate_paper_orders | idem | idem | MOB-AST-002 | sans onClick |
| DESK-ORD-008 | OrderArticle OR.PA | "Modifier" | 🟡 MOCK | ⚠️ FINANCIAL | Modal modif | RPC NEW: nx.fn_modify_paper_order | — | — | MOB-AST-003 | sans onClick |
| DESK-ORD-009 | OrderArticle OR.PA | "Annuler" | 🟡 MOCK | ⚠️ FINANCIAL | Annuler paliers OR.PA | RPC NEW: nx.fn_cancel_paper_order | — | — | — | sans onClick |

### 4.4 Page Portefeuille

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-PRT-001 | Header viewMode | [icon: List] Liste | 🔵 UI | 🎨 UI | setViewMode("list") | — | — | Re-render | MOB-PRT-001 | |
| DESK-PRT-002 | Header viewMode | [icon: LayoutGrid] Cartes | 🔵 UI | 🎨 UI | setViewMode("card") | — | — | idem | MOB-PRT-002 | |
| DESK-PRT-003 | FilterChip | "Tous" | 🔵 UI | 🎨 UI | setAccount("all") | — | — | idem | MOB-PRT-003 | |
| DESK-PRT-004 | FilterChip | "PEA Boursobank" | 🔵 UI | 🎨 UI | setAccount("PEA") | — | — | idem | MOB-PRT-004 | label diffère côté UI mais id="PEA" |
| DESK-PRT-005 | FilterChip | "CTO IBKR" | 🔵 UI | 🎨 UI | setAccount("CTO IBKR") | — | — | idem | MOB-PRT-005 | |
| DESK-PRT-006 | FilterChip | "CTO Trade Republic" | 🔵 UI | 🎨 UI | setAccount("CTO Trade Republic") | — | — | idem | MOB-PRT-006 | |
| DESK-PRT-007 | PortefeuilleTable Row ASML | Row ASML | 🔵 UI | 🎨 UI | Détail ASML | — | — | AssetDetailPage | MOB-PRT-007 | |
| DESK-PRT-008 | Row MC | | 🔵 UI | 🎨 UI | Détail MC | — | — | idem | MOB-PRT-008 | |
| DESK-PRT-009 | Row AI | | 🔵 UI | 🎨 UI | Détail AI | — | — | idem | MOB-PRT-009 | |
| DESK-PRT-010 | Row RMS | | 🔵 UI | 🎨 UI | Détail RMS | — | — | idem | MOB-PRT-010 | |
| DESK-PRT-011 | Row SU | | 🔵 UI | 🎨 UI | Détail SU | — | — | idem | MOB-PRT-011 | |
| DESK-PRT-012 | Row PANX | | 🔵 UI | 🎨 UI | Détail PANX | — | — | idem | MOB-PRT-012 | |
| DESK-PRT-013 | Row WPEA | | 🔵 UI | 🎨 UI | Détail WPEA | — | — | idem | MOB-PRT-013 | |
| DESK-PRT-014 | Row NVDA | | 🔵 UI | 🎨 UI | Détail NVDA | — | — | idem | — | desktop only — divergence vs mobile (mobile a ALSTI à la place) |

### 4.5 Page Watchlist

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-WCH-001 | Header viewMode | [icon: List] Liste | 🔵 UI | 🎨 UI | setViewMode("list") | — | — | Re-render | MOB-WCH-001 | |
| DESK-WCH-002 | Header viewMode | [icon: LayoutGrid] Cartes | 🔵 UI | 🎨 UI | setViewMode("card") | — | — | idem | MOB-WCH-002 | |
| DESK-WCH-003 | FilterChip | "Tous" | 🔵 UI | 🎨 UI | setFilter("all") | — | — | idem | MOB-WCH-003 | |
| DESK-WCH-004 | FilterChip | "Opportunités" | 🔵 UI | 🎨 UI | setFilter("opp") | — | — | idem | MOB-WCH-004 | id diffère ("opp" vs "opportunities") |
| DESK-WCH-005 | FilterChip | "Détenus" | 🔵 UI | 🎨 UI | setFilter("held") | — | — | idem | MOB-WCH-005 | |
| DESK-WCH-006 | FilterChip | "Ultra premium" | 🔵 UI | 🎨 UI | setFilter("ultra") | — | — | idem | MOB-WCH-006 | |
| DESK-WCH-007 | Row ISRG | | 🔵 UI | 🎨 UI | Détail ISRG | — | — | idem | MOB-WCH-011 | |
| DESK-WCH-008 | Row OR.PA | | 🔵 UI | 🎨 UI | Détail OR.PA | — | — | idem | MOB-WCH-010 | mobile ticker "OR" vs desktop "OR.PA" — divergence ticker |
| DESK-WCH-009 | Row AI | | 🔵 UI | 🎨 UI | Détail AI | — | — | idem | MOB-WCH-007 | |
| DESK-WCH-010 | Row MELI | | 🔵 UI | 🎨 UI | Détail MELI | — | — | idem | — | desktop only |
| DESK-WCH-011 | Row MC | | 🔵 UI | 🎨 UI | Détail MC | — | — | idem | — | desktop only |
| DESK-WCH-012 | Row RMS | | 🔵 UI | 🎨 UI | Détail RMS | — | — | idem | — | desktop only |
| DESK-WCH-013 | Row ASML | | 🔵 UI | 🎨 UI | Détail ASML | — | — | idem | — | desktop only (cf. mobile l'a en Portefeuille mais pas en Watchlist) |
| DESK-WCH-014 | Row SU | | 🔵 UI | 🎨 UI | Détail SU | — | — | idem | — | desktop only |
| DESK-WCH-015 | Row CRWD | | 🔵 UI | 🎨 UI | Détail CRWD | — | — | idem | — | desktop only |
| DESK-WCH-016 | Row NVDA | | 🔵 UI | 🎨 UI | Détail NVDA | — | — | idem | — | desktop only |

### 4.6 Page Détail Asset

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-AST-001 | DetailHeader | [icon: ArrowLeft] Retour | 🔵 UI | 🎨 UI | onBack() | — | — | Retour à la page courante | MOB-AST-001 | |
| DESK-AST-002 | Detail col gauche — Card Pour | (read-only display) | 🔵 UI | 🎨 UI | — | view: vw_signal_complete_v3 | — | — | — | non cliquable |
| DESK-AST-003 | Detail col gauche — Card Contre | (read-only) | 🔵 UI | 🎨 UI | — | idem | — | — | — | idem |
| DESK-AST-004 | Detail col gauche — Indicateur RSI | Card | 🔵 UI | 🎨 UI | — | idem | — | — | — | non cliquable |
| DESK-AST-005 | Detail col gauche — Indicateur PE forward / FCF / etc. | Cards (6) | 🔵 UI | 🎨 UI | — | idem | — | — | — | non cliquables |
| DESK-AST-006 | Detail col droite | "Valider les 3 ordres" + ArrowUpRight | 🟡 MOCK | ⚠️ FINANCIAL | Valider 3 paliers ISRG | RPC NEW: nx.fn_validate_paper_orders | { ticker, paliers, expires_at } | Toast + refresh | MOB-AST-002, DESK-TDY-009, DESK-ORD-002 | sans onClick |
| DESK-AST-007 | Detail col droite | "Détails ↗" | 🟡 MOCK | 🎨 UI | Drill-down (sec page complète, breakdown ?) | — | — | À spécifier | DESK-TDY-010 | sans onClick — intent UI |
| DESK-AST-008 | Detail col droite | "Reporter" | 🟡 MOCK | 📝 DATA | Reporter action | RPC NEW: nx.fn_postpone_action | { action_id, days } | Toast | MOB-AST-004 | sans onClick |
| DESK-AST-009 | Historique alertes — Row 9 mai | (read-only) | 🔵 UI | 🎨 UI | — | view: vw_alerts_history_v1 | — | — | — | non cliquable |
| DESK-AST-010 | Historique alertes — Row 12 avril | (read-only) | 🔵 UI | 🎨 UI | — | idem | — | — | — | idem |
| DESK-AST-011 | Historique alertes — Row 28 mars | (read-only) | 🔵 UI | 🎨 UI | — | idem | — | — | — | idem |

### 4.7 Page Dev/Admin

#### Section I — Pipeline KPIs

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-001 | DevPipelineKPIs | Bandeau (Engine V3.7 / Régime / Last daily / Statut) | 🔵 UI | 🎨 UI | (Display only) | view: vw_dev_pipeline_health | — | — | — | bandeau read-only ; pas de bouton |

#### Section II — Crons (14 jobs)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-002 | Crons row 1 | pipeline_daily_v37 | 🟡 MOCK | 🛡️ SYSTEM | Force run cron | RPC NEW: nx.fn_force_run_cron | { cron_name } | Toast + status pulse | — | row non cliquable actuellement, à câbler en bouton "Run now" |
| DESK-DEV-003 | Crons row 2 | fx_rates_eod | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | { cron_name:"fx_rates_eod" } | idem | — | idem |
| DESK-DEV-004 | Crons row 3 | telegram_dispatch | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-005 | Crons row 4 | alert_outcomes_j1 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-006 | Crons row 5 | alert_outcomes_j5 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-007 | Crons row 6 | yahoo_scout_flash | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-008 | Crons row 7 | engine_metrics_daily | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-009 | Crons row 8 | session_snapshot_auto | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-010 | Crons row 9 | broker_sync_pea | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-011 | Crons row 10 | broker_sync_ibkr | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-012 | Crons row 11 | broker_sync_tr | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-013 | Crons row 12 | rls_audit_check | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-014 | Crons row 13 | engine_compare_v3_v35 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-015 | Crons row 14 | agent_findings_archive | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |

#### Section III — Telegram

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-016 | DevTelegramPanel — Card stats | (Bot actif / Chat ID / Dernier envoi) | 🔵 UI | 🎨 UI | — | view: vw_dev_telegram_dispatch | — | — | — | display only |
| DESK-DEV-017 | Recent telegram row 1 | MELI 23:30 | 🟡 MOCK | 🛡️ SYSTEM | Renvoyer alerte Telegram | RPC NEW: nx.fn_telegram_resend_alert | { alert_id } | Toast + delivered=true (déjà true) | — | row non cliquable, à câbler bouton resend |
| DESK-DEV-018 | Recent telegram row 2 | CRWD 21:48 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-019 | Recent telegram row 3 | NVDA 20:15 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-020 | Recent telegram row 4 | PANX 18:55 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |
| DESK-DEV-021 | Recent telegram row 5 | AI 18:20 | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |

#### Section IV — Alertes du jour metrics

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-022 | Tile "Générées" | 18 | 🔵 UI | 🎨 UI | — | view: vw_dev_alerts_today_metrics | — | — | — | display |
| DESK-DEV-023 | Tile "Envoyées" | 5 | 🔵 UI | 🎨 UI | — | idem | — | — | — | display |
| DESK-DEV-024 | Tile "Dismissed" | 13 | 🔵 UI | 🎨 UI | — | idem | — | — | — | display |
| DESK-DEV-025 | Tile "J+1 pending" | 9 | 🔵 UI | 🎨 UI | — | idem | — | — | — | display |
| DESK-DEV-026 | Tile "J+5 pending" | 9 | 🔵 UI | 🎨 UI | — | idem | — | — | — | display |

#### Section V — Comptes brokers

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-027 | Card "PEA Boursobank" MANUAL_ONLY | Card | 🟡 MOCK | 🛡️ SYSTEM | Changer mode (MANUAL_ONLY/SEMI_AUTO/FULL_AUTO) | RPC NEW: nx.fn_set_account_mode | { account_id, mode } | Toast + refresh | — | non cliquable actuellement, à câbler en click → menu modes |
| DESK-DEV-028 | Card "CTO IBKR principal" SEMI_AUTO | Card | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | { account_id, mode } | idem | — | idem |
| DESK-DEV-029 | Card "CTO IBKR sub-account" FULL_AUTO | Card | 🟡 MOCK | 🛡️ SYSTEM | idem (kill switch implicite) | idem | { account_id, mode:"MANUAL_ONLY" } | idem | — | criticité particulière : ce sub-account est en mode FULL_AUTO ; un kill switch → MANUAL_ONLY est attendu côté brief Olivier |
| DESK-DEV-030 | Card "CTO Trade Republic" MANUAL_ONLY | Card | 🟡 MOCK | 🛡️ SYSTEM | idem | idem | — | idem | — | idem |

#### Section VI — Sécurité Supabase

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-031 | DevSecurityPanel — Card Bypass | Liste roles autorisés | 🔵 UI | 🎨 UI | — | view: vw_dev_security_audit | — | — | — | display |
| DESK-DEV-032 | DevSecurityPanel — Card Blocked | Liste roles bloqués | 🔵 UI | 🎨 UI | — | idem | — | — | — | display |
| DESK-DEV-033 | DevSecurityPanel — caption | "Snapshot rollback dispo dans nx_backup..." | 🔵 UI | 🎨 UI | — | — | — | — | — | display |
| DESK-DEV-034 | (À ajouter dans le câblage) | Bouton "Lancer audit RLS" | 🟡 MOCK | 🛡️ SYSTEM | Trigger fn_audit_rls | RPC NEW: nx.fn_audit_rls | — | Toast + table audit_log refresh | — | bouton actuellement absent du JSX, mais sémantiquement attendu |

#### Section VII — Migration EODHD

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-DEV-035 | DevEodhdPanel — bandeau | (Cutover prévu / Économie / Statut + barre progress) | 🔵 UI | 🎨 UI | — | view: vw_dev_eodhd_progress | — | — | — | display |
| DESK-DEV-036 | (À ajouter) | Bouton "Cutover maintenant" | 🟡 MOCK | 🛡️ SYSTEM | Lancer cutover EODHD live | RPC NEW: nx.fn_eodhd_cutover | — | Toast + status:"live" + refresh | — | bouton absent du JSX actuel |
| DESK-DEV-037 | (À ajouter) | Bouton "Rollback TD Pro" | 🟡 MOCK | 🛡️ SYSTEM | Rollback vers TD Pro | RPC NEW: nx.fn_eodhd_rollback | — | Toast + status:"shadow_mode" | — | bouton absent du JSX actuel |

### 4.8 Navigation desktop (TopNav + footer)

| ID | Section | Label | Statut | Criticité | Action cible | Backend | Payload | Effet retour | Duplicata of | Notes |
|----|---------|-------|--------|-----------|--------------|---------|---------|--------------|--------------|-------|
| DESK-NAV-001 | TopNav | "Tableau" | 🔵 UI | 🎨 UI | navigate("dashboard") | — | — | Render TableauPage | MOB-NAV-001 | |
| DESK-NAV-002 | TopNav | "Aujourd'hui" | 🔵 UI | 🎨 UI | navigate("today") | — | — | Render AujourdhuiPage | MOB-NAV-002 | |
| DESK-NAV-003 | TopNav | "Ordres" | 🔵 UI | 🎨 UI | navigate("orders") | — | — | Render OrdresPage | MOB-NAV-003 | |
| DESK-NAV-004 | TopNav | "Portefeuille" | 🔵 UI | 🎨 UI | navigate("portfolio") | — | — | Render PortefeuillePage | MOB-NAV-004 | |
| DESK-NAV-005 | TopNav | "Watchlist" | 🔵 UI | 🎨 UI | navigate("watchlist") | — | — | Render WatchlistPage | MOB-NAV-005 | |
| DESK-NAV-006 | TopNav | NexialLogo | 🔵 UI | 🎨 UI | (Pas d'onClick — div statique) | — | — | — | — | logo non cliquable, divergence vs convention web |
| DESK-NAV-007 | TopNav | [icon: Bell] Notifications + badge "5" | 🟡 MOCK | 📝 DATA | Ouvrir liste notifications + marquer lues | RPC NEW: nx.fn_mark_notifications_read | { user_id } | Vide badge | MOB-TAB-001 | bouton sans onClick mais aria-label="Notifications" |
| DESK-NAV-008 | Footer | Bouton "Dev" | 🔵 UI | 🎨 UI | navigate("dev") | — | — | Render DevAdminPage | — | onClick câblé, le seul accès à la page Dev |

---

## 5. Plan de câblage proposé

### Sprint 1 — FINANCIAL critique (Session prochaine)

Objectif : transformer tous les boutons d'ordre/asset en transactions DB réelles, avec audit log et idempotence.

- [ ] Créer table `nx.order_override_log` (audit complet validate/modify/cancel/postpone)
- [ ] RPC `nx.fn_validate_paper_orders(payload jsonb)` — insert N paliers en transaction, write to order_override_log
- [ ] RPC `nx.fn_modify_paper_order(order_id uuid, updates jsonb)` — update avec audit
- [ ] RPC `nx.fn_cancel_paper_order(order_id uuid, reason text)` — soft cancel + audit
- [ ] Route handlers : POST `/api/orders/validate`, `/api/orders/modify`, `/api/orders/cancel`
- [ ] Modales `ConfirmOrderModal` (confirme avant validate, montre quantité × prix), `EditOrderModal` (édit paliers), `CancelOrderModal` (motif obligatoire)
- [ ] Câblage IDs : MOB-AST-002 → 004, DESK-TDY-009/011/012/014/015/017, DESK-ORD-002 → 009, DESK-AST-006 → 008
- [ ] Tests : valider une fois ne crée pas de doublon (idempotence sur (user_id, ticker, palier_rank, expires_at)) ; cancel d'un palier ne touche pas les autres ; audit log capture before/after JSON

### Sprint 2 — DATA fréquent (alertes, watchlist, notifications)

Objectif : actions data utilisateur (dismiss, mark read, postpone), pas de risque financier.

- [ ] Table `nx.notifications_read_state` (user_id, last_read_at)
- [ ] Table `nx.action_postpone_log` (action_id, days, requested_at)
- [ ] RPC `nx.fn_mark_notifications_read(user_id)`
- [ ] RPC `nx.fn_postpone_action(action_id, days)`
- [ ] Vérifier signature existante `/api/alerts/dismiss` vs cible `nx.fn_dismiss_alert`
- [ ] Câblage IDs : MOB-TAB-001, DESK-NAV-007, DESK-TDY-018 → 022 (rendre les rows alertes cliquables avec affordance dismiss), MOB-AST-004, DESK-TDY-011/014/017, DESK-AST-008
- [ ] Bonus : rendre les rows Alertes cliquables (DESK-TDY-018 → 022) avec menu contextuel (dismiss / vers détail)

### Sprint 3 — SYSTEM (page Dev/Admin)

Objectif : tout le monitoring devient interactif. Seul l'utilisateur Olivier (gate role admin) y accède.

- [ ] Table `nx.cron_manual_runs` (cron_name, requested_at, requested_by, status)
- [ ] Table `nx.account_mode_change_log` (account_id, old_mode, new_mode, changed_at)
- [ ] RPC `nx.fn_force_run_cron(cron_name)` — gate role admin, dispatch via pg_net ou supabase functions
- [ ] RPC `nx.fn_telegram_resend_alert(alert_id)` — call Edge Function send-watchlist-alert avec alert_id
- [ ] RPC `nx.fn_set_account_mode(account_id, mode)` — gate admin + audit log
- [ ] RPC `nx.fn_audit_rls()` — réutilise `cron rls_audit_check` mais on-demand
- [ ] RPC `nx.fn_eodhd_cutover()` et `nx.fn_eodhd_rollback()` — flag config + rollback path
- [ ] Routes admin gated : `/api/admin/cron-run`, `/api/admin/telegram-resend`, `/api/admin/account-mode`, `/api/admin/rls-audit`, `/api/admin/eodhd-cutover`, `/api/admin/eodhd-rollback`
- [ ] Modifier le JSX desktop pour ajouter les boutons manquants : DESK-DEV-034 (Lancer audit RLS), DESK-DEV-036 (Cutover), DESK-DEV-037 (Rollback)
- [ ] Câblage IDs : DESK-DEV-002 → 015 (crons row → bouton "Run now"), DESK-DEV-017 → 021 (telegram → bouton "Resend"), DESK-DEV-027 → 030 (cards comptes → menu modes), DESK-DEV-034 → 037 (boutons admin)
- [ ] Confirm dialog spécial sur DESK-DEV-029 (FULL_AUTO sub-account → MANUAL_ONLY = kill switch)

### Sprint 4 — UI/Affordances manquantes (mineur)

- [ ] Câbler `onAccountClick` sur YourMoney mobile (MOB-TAB-006/007/008) ou retirer la prop
- [ ] Câbler "Tout voir" Timeline mobile (MOB-TAB-009)
- [ ] Rendre cards Indices Section Context cliquables (DESK-TDY-005 → 008) si on veut drill-down
- [ ] Rendre cards Top contributeurs/Détracteurs cliquables (Tableau et Aujourd'hui SectionMovers) — divergence vs Watchlist

---

## 6. Risques et points d'attention détectés

1. **Tickers divergents mobile vs desktop** : "OR" (mobile) vs "OR.PA" (desktop), "AI" (mobile) vs "AI.PA" (desktop). Le câblage backend doit normaliser les tickers (lookup table ou suffix Euronext systématique).
2. **Compte filter id divergent** : `MOB-WCH-004` utilise `setFilter("opportunities")` alors que `DESK-WCH-004` utilise `setFilter("opp")`. Trivial mais à uniformiser au moment du câblage pour partager la même URL search-param.
3. **Mobile a 8 positions, desktop 8 — mais composition différente** : mobile a ALSTI (PEA) à la 8e, desktop a NVDA (CTO IBKR) à la 8e. Mock divergent à corriger côté `MOCK.positions` ou à accepter comme variations de seed.
4. **Tous les boutons FINANCIAL sont actuellement sans onClick** : aucun handler attaché côté JSX pour Valider/Modifier/Annuler/Reporter, hors mobile/desktop bottom-nav et page-toggles. Pas de risque d'effet métier pour l'instant, mais le câblage devra TOUS les implémenter en une session pour éviter mismatch.
5. **Les rows Alertes desktop (DESK-TDY-018 → 022) ont un ChevronRight visuel mais pas de onClick** : intent UI implicite (cliquables) à confirmer côté UX.
6. **Mobile a une prop `onAccountClick` jamais câblée à AppRoot** (`YourMoney` la reçoit dans son code mais `DashboardPage` ne la passe pas). Code mort à nettoyer ou intent à finaliser.
7. **Page Dev/Admin desktop : 3 boutons absents du JSX mais sémantiquement attendus** (audit RLS on-demand, EODHD cutover, EODHD rollback). À ajouter au JSX au moment du câblage.
8. **`fn_get_opportunities_dashboard` existe déjà** (a61902e/Session 009) mais alimente la page `/opportunites` legacy, pas les protos mobile/desktop. À reconsidérer : réutiliser ou créer `fn_get_today_dashboard` dédié.
9. **Composant `OnboardingGate` orphelin** (mémoire feedback, à ignorer pour cette mission mais mention pour traçabilité).
10. **Sub-account FULL_AUTO** (DESK-DEV-029) doit être traité comme kill switch dédié — requiert confirm dialog double (saisie texte "CONFIRM") ou auth re-prompt.
11. **Désaccord seed mobile/desktop** : mobile MOCK contient ALERTS_TODAY (8 alertes) ; desktop MOCK contient `alerts` (5 alertes). Le câblage commun via `vw_alerts_active_v1` lèvera ce désaccord.
12. **Footer Dev seul point d'entrée admin** : pas de gate authentication actuellement (`navigate("dev")` change juste l'état React). Le câblage doit ajouter le gate `user.id === Olivier`.

---

## 7. Journal des mises à jour

- 2026-05-09 — Inventaire initial (Phase A) : 147 éléments classifiés, 36 duplicatas mobile↔desktop, 12 RPC backend à créer.
- 2026-05-09 — Phase A.5 : décisions sur les 4 anomalies §6 inscrites en §8 (anomaly resolutions). Tickers canonique = nx.assets.ticker (sans suffixe Yahoo) confirmé par lookup DB ; absence des 3 boutons admin Dev confirmée par grep (5 matches tous textuels passifs).

---

## 8. Anomaly resolutions (Phase A.5 — 2026-05-09)

Tranches sur les 4 anomalies bloquantes relevées en §6, validées avec lookups DB et grep JSX.

### 8.1 Tickers divergents OR (mobile) vs OR.PA (desktop) — RÉSOLU

**Vérification DB** (`nx.assets` lookup) :

| ticker | exchange_mic | currency | data_source_symbol_yahoo | name |
|--------|--------------|----------|--------------------------|------|
| OR  | XPAR | EUR | OR.PA | L'Oréal |
| AI  | XPAR | EUR | AI.PA | Air Liquide |
| ASML | XAMS | EUR | ASML.AS | ASML Holding |
| ISRG | XNAS | USD | ISRG | Intuitive Surgical |
| NVDA | XNAS | USD | NVDA | Nvidia |

**Décision** : ticker canonique = `nx.assets.ticker` (sans suffixe Yahoo).
- Le ticker en base est `OR`, pas `OR.PA`. `OR.PA` est strictement le symbol Yahoo (data source), stocké dans `data_source_symbol_yahoo`.
- Unicité inter-marché garantie par `(ticker, exchange_mic)` — c'est la clé business.
- Le pattern ADR-21 résolu utilise déjà `fn_resolve_yahoo_to_asset` pour résoudre dans l'autre sens (Yahoo → asset_id).
- Le mobile est conforme au modèle DB. Le desktop a un mock incorrect.

**Conséquence Sprint 1** :
- Tous les payloads RPC manipulent `ticker` (canonique) ou `asset_id` (UUID), jamais le symbol Yahoo.
- Les RPC résolvent l'asset par `(ticker, exchange_mic)` ou `asset_id`.
- Si le front envoie `OR.PA` au backend : bug front à corriger, pas une convention à supporter.
- Fix accompagnant pendant le câblage : remplacer `OR.PA` → `OR` et `AI.PA` → `AI` dans `nexial-desktop-complete.jsx` (mock data inline).

### 8.2 Mock positions ALSTI (mobile) vs NVDA (desktop) — AUCUNE ACTION

Décision : ne rien faire. Disparaît automatiquement au câblage live via `vw_positions` (Sprint 1+). Note d'archive uniquement.

### 8.3 onAccountClick mobile orphelin — DÉPLACÉ EN SPRINT 4

**Décision** : conserver la prop, câbler en Sprint 4 (UI/Affordances).
- **Action cible** : click sur row compte (`MOB-TAB-006/007/008`) → navigation vers Portefeuille avec filtre `account` pré-sélectionné sur le compte cliqué.
- Réutilise les filter chips existants (`MOB-PRT-003 → 006`).
- Pas de nouveau backend nécessaire.
- Spec UI : passer la prop `onAccountClick` depuis `DashboardPage` à `YourMoney`, handler navigation client-side avec setAccount(account_id) puis setCurrentPage("portfolio").

### 8.4 3 boutons admin absents du JSX desktop — DÉPLACÉ EN SPRINT 3

**Vérification grep** sur `nexial-desktop-complete.jsx` (5 matches sur `audit RLS|cutover|rollback|Lancer audit|Cutover maintenant|Rollback TD`) :

| Ligne | Contenu | Type |
|-------|---------|------|
| L316  | data structure timeline event "Cutover EODHD All-In-One..." | passif |
| L503  | data field mock `cutoverDate: "25 mai 2026"` | passif |
| L3124 | caption "Snapshot rollback disponible dans nx_backup..." | informatif |
| L3155 | eyebrow "Cutover prévu" | titre section |
| L3159 | affichage `{e.cutoverDate}` | passif |

Aucun `<button>`, aucun `onClick` à proximité. Absence des 3 boutons admin confirmée.

**Décision** : ajouter les 3 boutons au JSX pendant le Sprint 3 SYSTEM, avec les IDs déjà spécifiés en §4.7 :
- `DESK-DEV-034` — bouton "Lancer audit RLS" (section VI Sécurité Supabase)
- `DESK-DEV-036` — bouton "Cutover maintenant" (section VII Migration EODHD)
- `DESK-DEV-037` — bouton "Rollback TD Pro" (section VII Migration EODHD)

Specs RPC backend correspondantes déjà listées en §2.1 (`fn_audit_rls`, `fn_eodhd_cutover`, `fn_eodhd_rollback`).

---

## 9. Compteurs après Phase A.5 (inchangés vs §1)

Les décisions ci-dessus n'ajoutent **aucun nouvel élément interactif** au comptage Phase A. Les 3 boutons admin manquants étaient déjà comptés en §1 comme `🟡 MOCK 🛡️ SYSTEM` (DESK-DEV-034/036/037), avec note explicite "bouton actuellement absent du JSX, mais sémantiquement attendu". Ils seront créés au moment du Sprint 3.

Compteurs Phase A toujours valides : **147 total / 41 backend bindings / 30+19+6 par criticité / 36 duplicatas mobile↔desktop**.
