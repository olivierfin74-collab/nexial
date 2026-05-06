# Audit nexial-chi (P2.2)

**Date** : 2026-05-06
**Branche** : `main`
**Commit de référence** : `2380add` (chore: cleanup repo — remove nexial-app scaffold + dead code + harden gitignore)
**Repo** : github.com/olivierfin74-collab/nexial
**Méthode** : analyse statique du code local (lecture seule), zéro modification, zéro requête Supabase

---

## 1. Inventaire structurel

### 1.1 Stack précise

| Item | Valeur |
|---|---|
| Framework | Next.js **16.2.3** (App Router) |
| React | 19.2.4 |
| TypeScript | ^5 (mode strict) |
| Styling | **Tailwind CSS v4** (`@tailwindcss/postcss`, `@import "tailwindcss"` dans `globals.css`, `@theme inline`) |
| Lint | ESLint v9 + `eslint-config-next 16.2.3` |
| Package manager | **npm** (`package-lock.json` présent, pas de `yarn.lock`/`pnpm-lock.yaml`) |
| Supabase clients | `@supabase/ssr ^0.10.2` + `@supabase/supabase-js ^2.104.1` + `supabase` CLI ^2.95.5 (devDep) |
| Charts | `recharts ^3.8.1` |
| Icons | `lucide-react ^1.14.0` |
| Misc | `dotenv ^17.4.2` |
| Build script | `next dev` / `next build` / `next start` (Turbopack par défaut Next 16) |

### 1.2 Configuration build/projet

| Fichier | Statut | Notes |
|---|---|---|
| `next.config.ts` | **Vide** (config par défaut) | Aucune option custom |
| `tsconfig.json` | Strict, alias `@/*` → `./src/*`, `noEmit`, `moduleResolution: bundler` | OK |
| `postcss.config.mjs` | `@tailwindcss/postcss` uniquement | Tailwind v4 standard |
| `tailwind.config.ts` | **ABSENT** | ⚠ Tailwind v4 utilise `@theme` inline dans CSS — pas de fichier de config TS |
| `eslint.config.mjs` | Default Next | OK |
| `next-env.d.ts` | Auto-généré | OK |

### 1.3 Arborescence `src/app/` — 26 routes + racine

| Route | Type | Description (déduite du code) |
|---|---|---|
| `/` | Server (proxy) | Re-export de `dashboard/page` (1 ligne) |
| `/actions` | Client | Création d'ordres depuis suggestions auto, RPC `fn_create_execution_order_from_auto_suggestion_v1` |
| `/alerts` | Client | Engine alertes (mark seen/done/dismiss + run mobile notification engine) |
| `/allocation` | Client (créa client inline) | Allocation par compte via `vw_allocation_by_account_v2` |
| `/api/*` | Routes handlers | Voir 1.4 |
| `/app` | Server | Page hub avec quickLinks vers /portfolio, /patrimoine, etc. + redirect login si !user |
| `/auth/callback` | Route handler | OAuth/email magic link via `exchangeCodeForSession` |
| `/dashboard` | Client | **De facto home** — 800+ lignes, agrège `vw_invest_ui_v1`, `vw_execution_orders_ui_v1`, `vw_patrimoine_total_general_eur_v1` |
| `/decision-engine` | Server | Lecture CIO via `vw_decision_engine_v2` (efficacité capital, opportunity cost) |
| `/dev` | (à investiguer) | Outils dev — exposé dans NAV principal AppNav, ⚠ accessible en prod |
| `/entry-plans` | Client | Plans d'entrée échelonnés depuis Supabase (`EntryPlanRow[]`) |
| `/invest` | Client (créa client inline) | Vue invest (route protégée par middleware `/invest/:path*`) |
| `/invest-now` | (page) | Plan invest immédiat via `vw_invest_now_plan_v1` |
| `/login` | Client | Form email/password `signInWithPassword` |
| `/mobile` | Client | Command center mobile (RPC `fn_run_mobile_notification_engine_v1`, `fn_mark_alert_seen_v1`) — ⚠ fichier nommé `pages.tsx` au lieu de `page.tsx` (à vérifier) |
| `/onboarding` | Client | Setup user, upsert `user_onboarding_state_v1` |
| `/opportunities` | (page) | Lecture `vw_arbitrage_targets_ranked_v2` |
| `/orders` | Client | Suivi/confirmation des ordres (Orders Engine v1.2 récent) |
| `/patrimoine` | Client (créa client inline) | Patrimoine global via 3 vues: `vw_patrimoine_global_v2`, `vw_patrimoine_by_account_v1`, `vw_patrimoine_cash_by_currency_v1` |
| `/performance` | (page) | Performance tracking — non lu en détail |
| `/portfolio` | Client | Positions/P&L — non lu en détail |
| `/preferences` | Client (créa client inline) | Lecture `allocation_preferences_v1` + `vw_portfolio_positions_v1` |
| `/reset-password` | Client | `resetPasswordForEmail` |
| `/signals` | Client (créa client inline) | Lecture `signal_logs_v1` |
| `/signup` | Client | `signUp` |
| `/update-password` | Client | Set nouveau password |
| `/watchlist` | Client | Watchlist actifs suivis — non lu en détail |

**Routes manquantes par rapport au plan ADR-10 v2** : ❌ `/aujourdhui`, `/today`, `/home` n'existent pas. La home actuelle = `/` proxy vers `/dashboard`.

### 1.4 Routes API (`src/app/api/`)

| Route | Méthode | Notes |
|---|---|---|
| `api/alerts/dismiss` | POST | RPC `fn_log_dismiss_alert_v2` |
| `api/alerts/execute` | POST | RPC `fn_log_execute_alert_v3` |
| `api/claude` | (endpoint Claude API) | Non lu en détail |
| `api/dev/save-checkpoint` | POST | Tables `dev_projects`, `dev_snapshots`, `dev_sessions`, `dev_chat_handoffs` |
| `api/invest` | (route) | Vue `vw_portfolio_accounts_summary_v1`, `vw_portfolio_positions_core_v2`, `getUser` server-side ✅ |
| `api/preferences/save` | POST | `allocation_preferences_v1` |
| `api/preferences/delete` | POST | `allocation_preferences_v1` |
| `api/send-live-alerts` | POST | `telegram_alerts_live_v1` (utilise SERVICE_ROLE_KEY) |
| `api/signals/log` | POST | `signal_logs_v1` |
| `api/update-intraday-prices` | POST | `market_data_intraday` (utilise SERVICE_ROLE_KEY) |

### 1.5 `src/components/` — 8 fichiers + 3 sous-dossiers

| Composant | Rôle |
|---|---|
| `AccountFilters.tsx` | Filtres par compte (PEA/CTO/etc.) |
| `DeletePreferenceButton.tsx` | Action DELETE preference |
| `FeedbackModal.tsx` | Modal feedback utilisateur (`user_feedback_v1`) |
| `FreshnessBanner.tsx` | Bandeau fraîcheur data |
| `LogSignalsButton.tsx` | Bouton log signaux |
| `NexialChart.tsx` | Chart custom (recharts) |
| `OnboardingGate.tsx` | Garde onboarding |
| `PreferencesForm.tsx` | Form prefs |
| `dashboard/AlertActions.tsx` | Actions sur alertes côté dashboard |
| `layout/AppNav.tsx` | Nav principale (7 items: Dashboard, Portfolio, Watchlist, Actions, Orders, Patrimoine, **Dev**) |
| `layout/Sidebar.tsx` | Sidebar |
| `ui/Badge.tsx` | Badge UI primitif |

**Composants ADR-10 v2 attendus** : ❌ `ScoreGauge`, `Sparkline`, `ActionCard`, `PourContre`, `ConfianceIABars` — **AUCUN n'existe**.

### 1.6 `src/lib/`

| Fichier/dossier | Rôle |
|---|---|
| `supabase.ts` | ⚠ **Legacy** : `createClient(url, anonKey)` direct, sans SSR, sans cookies |
| `supabase/client.ts` | Browser client moderne `@supabase/ssr` (publishable_key) |
| `supabase/server.ts` | Server client moderne `@supabase/ssr` + `cookies()` (publishable_key) |
| `engine/investmentEngine.ts` | Logique invest |
| `engine/recommendationEngine.ts` | Reco engine |
| `engine/triggerEngine.ts` | Triggers |
| `engine/watchlistEngine.ts` | Watchlist logic |
| `filters/accountFilters.ts` | Filtres comptes |
| `freshness/dataFreshness.ts` | Fraîcheur data |
| `format.ts` | Helpers formatage (eur, money, num, formatDate) |
| `investment-ui.ts` | Helpers UI (getDecisionTone, getMomentumTone, getZoneTone) |

### 1.7 `src/domains/` & `src/types/`

- `domains/invest/` : `data.ts`, `engine.ts`, `types.ts` — pattern domain-driven, **seul domaine existant**
- `types/investment.ts` : types partagés (incluant `DecisionEngineRow`)

### 1.8 Pas présent

- ❌ `src/hooks/` (aucun custom hook centralisé)
- ❌ `src/utils/`
- ❌ `tailwind.config.ts`

---

## 2. Consommations DB

### 2.1 Inventaire `.from(<table>)` — 28 occurrences, 18 sources uniques

```
src/domains/invest/data.ts:10              vw_arbitrage_targets_ranked_v2
src/domains/invest/data.ts:14              vw_account_cash_latest
src/components/OnboardingGate.tsx:61       user_onboarding_state_v1
src/components/layout/AppNav.tsx:188       user_onboarding_state_v1
src/components/layout/AppNav.tsx:216       user_onboarding_state_v1
src/components/FeedbackModal.tsx:29        user_feedback_v1                    (insert)
src/app/allocation/page.tsx:61             vw_allocation_by_account_v2
src/app/api/send-live-alerts/route.ts:20   telegram_alerts_live_v1
src/app/invest-now/page.tsx:11             vw_invest_now_plan_v1
src/app/api/dev/save-checkpoint/route.ts   dev_projects, dev_snapshots, dev_sessions, dev_chat_handoffs
src/app/api/invest/route.ts:82             vw_portfolio_accounts_summary_v1
src/app/api/invest/route.ts:108            vw_portfolio_positions_core_v2
src/app/api/preferences/save/route.ts:40   allocation_preferences_v1
src/app/opportunities/page.tsx:52          vw_arbitrage_targets_ranked_v2
src/app/api/preferences/delete/route.ts:21 allocation_preferences_v1
src/app/api/update-intraday-prices/route.ts:42  market_data_intraday
src/app/decision-engine/page.tsx:11        vw_decision_engine_v2
src/app/onboarding/page.tsx:42             user_onboarding_state_v1            (upsert)
src/app/signals/page.tsx:26                signal_logs_v1
src/app/preferences/page.tsx:26            allocation_preferences_v1
src/app/preferences/page.tsx:30            vw_portfolio_positions_v1
src/app/api/signals/log/route.ts:46        signal_logs_v1                      (insert)
src/app/patrimoine/page.tsx:123            vw_patrimoine_global_v2
src/app/patrimoine/page.tsx:124            vw_patrimoine_by_account_v1
src/app/patrimoine/page.tsx:125            vw_patrimoine_cash_by_currency_v1

# Plus, références par constantes dans dashboard/page.tsx :
src/app/dashboard/page.tsx (INVEST_VIEW)        vw_invest_ui_v1
src/app/dashboard/page.tsx (ORDERS_VIEW)        vw_execution_orders_ui_v1
src/app/dashboard/page.tsx (PATRIMOINE_VIEW)    vw_patrimoine_total_general_eur_v1
```

**Sources uniques par catégorie** :
- **Tables** (8) : `allocation_preferences_v1`, `dev_chat_handoffs`, `dev_projects`, `dev_sessions`, `dev_snapshots`, `market_data_intraday`, `signal_logs_v1`, `telegram_alerts_live_v1`, `user_feedback_v1`, `user_onboarding_state_v1`
- **Vues `vw_*`** (15) : `vw_account_cash_latest`, `vw_allocation_by_account_v2`, `vw_arbitrage_targets_ranked_v2`, `vw_decision_engine_v2`, `vw_execution_orders_ui_v1`, `vw_invest_now_plan_v1`, `vw_invest_ui_v1`, `vw_patrimoine_by_account_v1`, `vw_patrimoine_cash_by_currency_v1`, `vw_patrimoine_global_v2`, `vw_patrimoine_total_general_eur_v1`, `vw_portfolio_accounts_summary_v1`, `vw_portfolio_positions_core_v2`, `vw_portfolio_positions_v1`

### 2.2 Inventaire `.rpc(<function>)` — 11 occurrences, 7 RPC uniques

```
src/app/actions/page.tsx:498   fn_create_execution_order_from_auto_suggestion_v1   (CREATE_ORDER_RPC)
src/app/actions/page.tsx:501   fn_create_execution_order_from_auto_suggestion_v1   (retry alt param)
src/app/alerts/page.tsx:448    fn_run_mobile_notification_engine_v1
src/app/alerts/page.tsx:460    fn_mark_alert_seen_v1
src/app/alerts/page.tsx:474    fn_mark_alert_done_v1
src/app/alerts/page.tsx:488    fn_dismiss_alert_v1
src/app/mobile/pages.tsx:297   fn_run_mobile_notification_engine_v1
src/app/mobile/pages.tsx:308   fn_mark_alert_seen_v1
src/app/api/alerts/dismiss/route.ts:18    fn_log_dismiss_alert_v2
src/app/api/alerts/execute/route.ts:28    fn_log_execute_alert_v3
```

**RPC uniques (7)** : `fn_create_execution_order_from_auto_suggestion_v1`, `fn_dismiss_alert_v1`, `fn_log_dismiss_alert_v2`, `fn_log_execute_alert_v3`, `fn_mark_alert_done_v1`, `fn_mark_alert_seen_v1`, `fn_run_mobile_notification_engine_v1`

### 2.3 Hooks/queries Supabase custom

❌ **AUCUN** : zéro `useQuery`, zéro `useSWR`, zéro `useMutation`. Pas de TanStack Query, pas de SWR, pas de React Query.

**Pattern actuel** :
- Server Components : `await supabase.from(...).select(...)` ou `await supabase.rpc(...)` directement
- Client Components : `useEffect` + `useState` + appel manuel à `createClient()` puis `.from()`

---

## 3. Mapping legacy → nx.*

⚠ **CONSTAT MAJEUR** : **ZÉRO référence à `nx.*` dans le code**. 100 % des consommations DB ciblent le schéma `public` (`vw_*`, `fn_*` non préfixées). La migration vers `nx.*` est **green-field côté code**.

| Source legacy actuelle (code) | Cible `nx.*` | Fichiers concernés | Priorité |
|---|---|---|---|
| `vw_decision_engine_v2` | `nx.fn_get_signal_dashboard` | `src/app/decision-engine/page.tsx:11` ; `src/types/investment.ts` (`DecisionEngineRow`) | **P2.3** |
| `vw_invest_ui_v1` | `nx.fn_get_signal_dashboard` (probable, à arbitrer) | `src/app/dashboard/page.tsx` (constante `INVEST_VIEW`) | **P2.3** |
| `vw_arbitrage_targets_ranked_v2` | TBD (curation Tier 1 ?) | `src/domains/invest/data.ts:10` ; `src/app/opportunities/page.tsx:52` | P2.3 |
| `vw_execution_orders_ui_v1` | `nx.fn_get_my_order_proposals` (probable) | `src/app/dashboard/page.tsx` (`ORDERS_VIEW`) ; à confirmer côté `/orders` | **P2.3** |
| Alertes : `fn_*_alert_*_v1/v2/v3` (5 RPC) | `nx.fn_get_my_active_alerts` + actions consolidées | `src/app/alerts/page.tsx` ; `src/app/mobile/pages.tsx` ; `src/app/api/alerts/{dismiss,execute}/route.ts` | **P2.3** |
| `vw_invest_now_plan_v1` | TBD | `src/app/invest-now/page.tsx:11` | P2.3 |
| `vw_allocation_by_account_v2` | TBD | `src/app/allocation/page.tsx:61` | P3.1 |
| `vw_patrimoine_*_v1/v2` (3 vues) | TBD (`nx.vw_patrimoine_*` ?) | `src/app/patrimoine/page.tsx:123-125` ; `src/app/dashboard/page.tsx` (`PATRIMOINE_VIEW`) | P3.1 |
| `vw_portfolio_*_v1/v2` (3 vues) | TBD (`nx.vw_portfolio_*` ?) | `src/app/api/invest/route.ts:82,108` ; `src/app/preferences/page.tsx:30` | P3.1 |
| `vw_account_cash_latest` | TBD | `src/domains/invest/data.ts:14` | P3.1 |
| Tables `assets` (référence indirecte par tickers) | `nx.assets` | (consommation indirecte via vues) | **P0.2** (déjà couvert ?) |
| `user_onboarding_state_v1` | `nx.fn_get/set_onboarding` (probable) | `src/components/OnboardingGate.tsx:61` ; `src/components/layout/AppNav.tsx:188,216` ; `src/app/onboarding/page.tsx:42` | future |
| `allocation_preferences_v1` | `nx.fn_get/save_preferences` | `src/app/preferences/page.tsx:26` ; `src/app/api/preferences/{save,delete}/route.ts` | future |
| `signal_logs_v1` | `nx.fn_log_signal` | `src/app/signals/page.tsx:26` ; `src/app/api/signals/log/route.ts:46` | future |
| `user_feedback_v1` | TBD (rester en table simple ?) | `src/components/FeedbackModal.tsx:29` | future |
| `telegram_alerts_live_v1` | TBD (canal externe) | `src/app/api/send-live-alerts/route.ts:20` | future |
| `market_data_intraday` | `nx.market_data_intraday` (probable) | `src/app/api/update-intraday-prices/route.ts:42` | P3.1 |
| `dev_*` (4 tables) | À supprimer (route `/api/dev/save-checkpoint` à retirer ?) | `src/app/api/dev/save-checkpoint/route.ts` | cleanup |

---

## 4. Audit design system actuel vs ADR-10 v2 Light Editorial

### 4.1 État du système actuel

**`src/app/globals.css`** (27 lignes) — boilerplate Next.js intact :
```css
:root {
  --background: #ffffff;
  --foreground: #171717;
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}
@media (prefers-color-scheme: dark) { ... }
body { font-family: Arial, Helvetica, sans-serif; }
```

**`src/app/layout.tsx`** (16 lignes) — body en **dark mode bleu marine radial** :
```tsx
<body className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,#1e3a8a_0,#07111f_45%,#020617_100%)] text-white">
```
→ Conflit visuel direct avec ADR-10 v2 (canvas beige clair `#FBF9F4`).

### 4.2 Comparaison cible vs existant

| Élément | Cible ADR-10 v2 | Existant nexial-chi | Verdict |
|---|---|---|---|
| Canvas | `#FBF9F4` | `#ffffff` (light root) / radial bleu marine `#1e3a8a → #020617` (body) | ❌ à migrer |
| Surface | `#FFFFFF` | `bg-white` + `border-neutral-200` (decision-engine, dashboard) | ⚠ partiel — surface OK mais sur fond bleu, contraste cassé |
| Vert forêt signature | `#2D5F3F` | absent | ❌ à créer |
| Burgundy | `#7A3838` | absent | ❌ à créer |
| Pour cards positives | `#E8EFE5` | absent (couleurs sémantiques généralement via `text-green-*`/`bg-green-*` Tailwind defaults) | ❌ à créer |
| Contre cards négatives | `#F2EBDD` | absent | ❌ à créer |
| Alert ambre | `#FDF4E3` | absent | ❌ à créer |
| Hero font display | Tobias / Fraunces / Playfair Display (serif), 32-44px, LS −0.015 à −0.02em | `font-geist-sans` (var) ; `Arial, Helvetica, sans-serif` (body fallback) ; aucun serif | ❌ à intégrer (next/font) |
| Body | Inter sans-serif 14-16px | `Arial, Helvetica, sans-serif` (boilerplate) ; `font-geist-sans` (var, partiellement utilisé) | ❌ à migrer |
| Mono | JetBrains Mono (tickers, prix, %) | `font-geist-mono` (var) | ⚠ partiel — mono présent mais pas JetBrains |
| **Composants ADR-10** | | | |
| ScoreGauge (radiale + 4 axes Q/G/M/V) | composant à créer | absent | ❌ |
| Sparkline (gradient fill + dot final) | composant à créer | absent (`NexialChart.tsx` existe mais usage et style différents) | ❌ |
| ActionCard | composant à créer | absent | ❌ |
| Pour/Contre cards | composant à créer | absent | ❌ |
| Confiance IA bars staggered (7-8 agents) | composant à créer | absent | ❌ |
| Garde-fou allocation alert ambre | composant à créer | absent | ❌ |
| Slider montant €500-5000 | composant à créer | absent | ❌ |
| CTA hierarchy (Valider primary dark / Détails / Reporter outline) | tokens + variants à définir | inconsistant : variantes ad-hoc dans chaque page | ❌ |

### 4.3 Verdict global section 4

**❌ NON CONFORME**. Quasiment **0 %** des tokens et composants ADR-10 v2 sont implémentés. Le code actuel est un thème dark mode bleu marine ; la cible est un thème light editorial beige/crème. **Refonte complète du design system requise**.

---

## 5. Fichiers à toucher en P2.3 (page Aujourd'hui)

### 5.1 Page principale "Aujourd'hui"

❌ **N'existe pas**. Aucune route `/aujourdhui`, `/today`, `/home`. La home actuelle = `/` proxy vers `/dashboard` (1 ligne re-export).

**Décision à prendre P2.3** :
- **Option A** : créer `src/app/aujourdhui/page.tsx` ex nihilo + faire pointer `src/app/page.tsx` vers `aujourdhui/page` (1 ligne à modifier)
- **Option B** : refondre `src/app/dashboard/page.tsx` en place (mais le fichier existant est volumineux ~800 lignes — refonte = réécriture)

Recommandation : **Option A**. Plus propre, isole le travail v2, garde `/dashboard` comme fallback legacy le temps de la transition.

### 5.2 Composants à CRÉER (5 nouveaux)

| Chemin | Rôle |
|---|---|
| `src/components/ScoreGauge.tsx` | Gauge radiale avec 4 axes (Quality / Growth / Momentum / Valuation) |
| `src/components/Sparkline.tsx` | Sparkline avec gradient fill + dot final (probablement via recharts déjà présent, ou pure SVG) |
| `src/components/ActionCard.tsx` | Card action principale (slot pour titre, score, CTA hierarchy) |
| `src/components/PourContre.tsx` | 2 cards Pour (vert `#E8EFE5`) / Contre (beige `#F2EBDD`) |
| `src/components/ConfianceIABars.tsx` | Bars staggered pour 7-8 agents IA (visualisation confiance) |

### 5.3 Composants existants à MODIFIER

| Composant | Raison |
|---|---|
| `src/components/layout/AppNav.tsx` | Ajouter route "Aujourd'hui" en première position de `NAV_ITEMS` (ligne 58). Retirer ou conditionnaliser `/dev` (ligne 65) en prod. Adapter classes au nouveau theme light. |
| `src/components/ui/Badge.tsx` | Adapter palette aux tokens ADR-10 v2 (variantes Pour/Contre/Alert/Neutral) |
| `src/components/FreshnessBanner.tsx` | Adapter au theme light (couleurs warning ambre `#FDF4E3`) |
| `src/components/NexialChart.tsx` | Vérifier compatibilité avec nouvelle palette ; éventuellement forker pour Sparkline |

### 5.4 Hooks à CRÉER (3 nouveaux)

⚠ Aucun pattern hook custom n'existe (ni TanStack Query, ni SWR). **Décision préalable P2.3** : adopter une lib query (TanStack Query recommandée pour les patterns cache/revalidation) OU rester en useState manuel.

| Hook | Chemin proposé | RPC cible |
|---|---|---|
| `useSignalDashboard` | `src/hooks/useSignalDashboard.ts` | `nx.fn_get_signal_dashboard` |
| `useActiveAlerts` | `src/hooks/useActiveAlerts.ts` | `nx.fn_get_my_active_alerts` |
| `useOrderProposals` | `src/hooks/useOrderProposals.ts` | `nx.fn_get_my_order_proposals` |

→ Création nécessaire du dossier `src/hooks/` (n'existe pas).

### 5.5 Layouts et globals à MODIFIER

| Fichier | Action |
|---|---|
| `src/app/layout.tsx` | (1) Remplacer `bg-[radial-gradient(...)]` par classe `bg-canvas` (ou `bg-[#FBF9F4]`) ; (2) Retirer `text-white` ; (3) Ajouter intégration `next/font` pour Fraunces (ou substitut display) + Inter + JetBrains Mono ; (4) Pousser variables CSS via classes sur `<html>` |
| `src/app/globals.css` | Migration tokens via `@theme` inline (Tailwind v4) : ajouter `--color-canvas`, `--color-surface`, `--color-vert-foret`, `--color-burgundy`, `--color-pour`, `--color-contre`, `--color-alert-ambre`, `--font-display`, `--font-body`, `--font-mono`. Supprimer le block dark-mode boilerplate (ou inverser logique). Body font: Inter au lieu d'Arial. |
| `tailwind.config.ts` | ⚠ **N'existe pas et ne doit PAS être créé** : Tailwind v4 utilise `@theme` inline dans CSS. Si une création est tentée, elle sera ignorée par v4. (Voir surprise §7.4) |

### 5.6 Autres fichiers potentiels (non listés dans la spec)

- `src/app/page.tsx` (1 ligne) → re-export à pointer vers `aujourdhui/page` au lieu de `dashboard/page`
- `src/middleware.ts` → ajouter `/aujourdhui` au matcher pour la protection auth (cf. recommandations P2.3 hors scope direct)

---

## 6. Plan migration P2.3 chiffré et ordonné

| # | Fichier/composant | Action | Estim (min) | Dépendances |
|---|---|---|---|---|
| 1 | `src/app/globals.css` | Migrer tokens couleur + fonts vers ADR-10 v2 via `@theme` inline (Tailwind v4) | 25 | — |
| 2 | `src/app/layout.tsx` | Intégrer Fraunces/Inter/JetBrains Mono via `next/font` + body bg `#FBF9F4` + retirer `text-white` | 20 | 1 |
| 3 | `src/components/ui/Badge.tsx` | Adapter variantes au nouveau palette | 15 | 1 |
| 4 | `src/components/Sparkline.tsx` | Créer composant gradient fill + dot final (pure SVG ou recharts) | 35 | 1, 2 |
| 5 | `src/components/ScoreGauge.tsx` | Créer gauge radiale + 4 axes Q/G/M/V (SVG custom) | 45 | 1, 2 |
| 6 | `src/components/PourContre.tsx` | Créer 2 cards (Pour vert, Contre beige) avec slots | 20 | 1, 2 |
| 7 | `src/components/ConfianceIABars.tsx` | Créer bars staggered 7-8 agents | 25 | 1, 2 |
| 8 | `src/components/ActionCard.tsx` | Créer card action principale + CTA hierarchy | 30 | 1, 2, 3 |
| 9 | `src/hooks/useSignalDashboard.ts` | Hook RPC `nx.fn_get_signal_dashboard` (préreq : choix lib query) | 25 | — (mais préreq décision arch) |
| 10 | `src/hooks/useActiveAlerts.ts` | Hook RPC `nx.fn_get_my_active_alerts` | 20 | 9 (pattern partagé) |
| 11 | `src/hooks/useOrderProposals.ts` | Hook RPC `nx.fn_get_my_order_proposals` | 20 | 9 |
| 12 | `src/app/aujourdhui/page.tsx` | Créer page Aujourd'hui assemblant ScoreGauge + Sparkline + Pour/Contre + ConfianceIABars + ActionCard, branchée sur les 3 hooks | 60 | 1-11 |
| 13 | `src/app/page.tsx` | Re-export vers `aujourdhui/page` au lieu de `dashboard/page` | 5 | 12 |
| 14 | `src/components/layout/AppNav.tsx` | Ajouter "Aujourd'hui" en tête `NAV_ITEMS` + conditionnaliser `/dev` ; adapter classes light theme | 25 | 1, 2 |
| 15 | Test fonctionnel local (`npm run dev`) + smoke prod-like (`npm run build && npm start`) | Vérification visuelle des 5 composants + page Aujourd'hui ; check console errors | 30 | 1-14 |

**Total : 400 min ≈ 6h40 de dev pur**.

Marges à prévoir :
- +30-60 min si décision de lib query (TanStack Query) car install + setup + provider dans `layout.tsx`
- +30 min si les 3 RPC `nx.fn_*` n'existent pas encore côté Supabase et qu'il faut les créer (devrait être fait en P2.1 mais à confirmer)
- +20-30 min pour ajustements pixel-perfect ADR-10 sur les composants

**Total réaliste : 7h30 - 8h30** pour P2.3 complète.

---

## 7. Surprises / Points d'attention

### 7.1 ⚠ DOUBLE Supabase client coexistant
- `src/lib/supabase.ts` (legacy : `createClient(url, anonKey)` direct, sans SSR ni cookies)
- `src/lib/supabase/{client,server}.ts` (modern : `@supabase/ssr` avec cookies, publishable_key)
- Les pages utilisent l'un OU l'autre **inconsistemment**. À harmoniser en P2.3 ou plus tôt. Migration recommandée : tout vers `@/lib/supabase/{client,server}`, supprimer `lib/supabase.ts`.

### 7.2 ⚠ DOUBLE convention env var
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (legacy, utilisé par `lib/supabase.ts`, `signals/page.tsx`, `preferences/page.tsx`, `api/preferences/*`, `api/signals/log`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (moderne, utilisé par middleware, `lib/supabase/{client,server}`, `dashboard`, `allocation/page.tsx`, `invest/page.tsx`, `patrimoine/page.tsx`)
- **Risque prod** : si une seule variable est définie côté Vercel env, **la moitié des pages cassera** au runtime (`process.env.X!` → undefined → crash Supabase client). À vérifier d'urgence dans dashboard Vercel.

### 7.3 ⚠ Création client inline dupliquée
Pages qui appellent `createClient(url, key)` directement au lieu d'utiliser le helper :
- `src/app/allocation/page.tsx` (ligne 7-9)
- `src/app/invest/page.tsx` (ligne 7-8)
- `src/app/patrimoine/page.tsx` (ligne 14-15)
- `src/app/preferences/page.tsx` (ligne 6-7)
- `src/app/signals/page.tsx` (ligne 4-5)
- `src/app/api/preferences/{save,delete}/route.ts`
- `src/app/api/signals/log/route.ts`

→ Anti-DRY, dette technique. Refactoring "batch" recommandé en parallèle de P2.3.

### 7.4 ⚠ Tailwind v4 sans `tailwind.config.ts`
La spec utilisateur (section 5) mentionne "tailwind.config.ts → migration tokens couleur ADR-10". **Mais le fichier n'existe pas et ne doit pas être créé** : Tailwind v4 utilise des directives `@theme` inline dans les CSS (`globals.css`). Toute la config tokens/fonts se fait là. Si on crée un `tailwind.config.ts`, il sera ignoré par le toolchain v4.

### 7.5 ⚠ `vw_decision_engine_v2` (pas v5/v6)
La spec section 3 mentionne `vw_decision_engine_v5/v6` comme source legacy. **Le code utilise actuellement `vw_decision_engine_v2`** (`decision-engine/page.tsx:11`). Soit v5/v6 sont sur Supabase mais pas branchés, soit la version cible côté code n'est pas celle attendue. À clarifier en début de P2.3.

### 7.6 ⚠ `/dev` exposé dans NAV principal
`src/components/layout/AppNav.tsx:65` :
```tsx
{ href: '/dev', label: 'Dev', mode: 'DEV', description: 'Contrôle moteur', icon: <Code2 size={15} /> }
```
Visible et cliquable en prod par tous les users authentifiés. À conditionnaliser (`role === 'super_admin'` ou `process.env.NODE_ENV === 'development'`) avant tout cleanup ou dans P2.3.

### 7.7 ⚠ Fichier `mobile/pages.tsx` (nom non standard)
`src/app/mobile/pages.tsx` — nom **`pages.tsx`** au lieu de **`page.tsx`** attendu par App Router. Très probablement un typo ; signifie que la route `/mobile` ne s'affiche pas (pas de route handler reconnue). Le fichier compile mais n'est pas accessible en URL. À investiguer/corriger.

### 7.8 ⚠ Tables `dev_*` et route `/api/dev/save-checkpoint`
4 tables (`dev_projects`, `dev_snapshots`, `dev_sessions`, `dev_chat_handoffs`) consommées uniquement par `api/dev/save-checkpoint/route.ts`. Probablement vestige du système périmé "save/resume ChatGPT" remplacé par `nx.fn_get_session_brief` (cf. ADR-11). À supprimer en cleanup séparé.

### 7.9 ✅ Cleanup `nexial-app/` confirmé
**Aucun import résiduel** depuis `nexial-app/` détecté dans tout le repo (Grep multi-patterns). Le commit `2380add` a effectivement et complètement éliminé la sandbox.

### 7.10 ✅ Stack auth propre
Pas de `next-auth`, pas de `drizzle`, pas de `prisma`. 100 % Supabase Auth via `@supabase/ssr` moderne. Pattern idiomatique.

### 7.11 ℹ Aucune lib de query/cache
Pas de TanStack Query, SWR, useQuery, useSWR. **Décision architecturale à prendre P2.3** :
- Adopter TanStack Query (recommandé pour cache/revalidation/optimistic updates)
- OU rester en useState/useEffect manuel (cohérent avec l'existant, mais limite scalabilité)

Cette décision affecte les hooks à créer (§5.4).

### 7.12 ℹ Page `/dashboard` est ~800 lignes
Le fichier `src/app/dashboard/page.tsx` est monolithique (j'ai lu 120 lignes, beaucoup d'autres types et logique en dessous). Si la décision est de refondre dashboard en place, la complexité est élevée. L'option A de §5.1 (créer `/aujourdhui` ex nihilo) reste recommandée.

### 7.13 ℹ Coexistence `Doc/` et `docs/` sur disque (Windows)
Git Bash + NTFS distinguent `Doc/` (uppercase, votre arbo historique) et `docs/` (lowercase, créé par les commits distants `5d1bac3`/`bbeadc1`). Ce rapport est créé dans `docs/audit/` (lowercase, conforme à la convention git). À normaliser dans un commit séparé "fix: normalize docs/ casing" comme déjà acté.

### 7.14 ℹ Convention `publishable_key` est la nouvelle nomenclature Supabase
Supabase a renommé `anon_key` → `publishable_key` en 2025. Garder `publishable_key` partout (pas de retour arrière vers `anon_key`).

---

## Recommandations prioritaires actionables

1. **Avant P2.3** :
   - Vérifier env vars Vercel : les **deux** `NEXT_PUBLIC_SUPABASE_ANON_KEY` ET `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` doivent être définies tant que la double convention persiste (sinon prod casse)
   - Confirmer existence côté Supabase des RPC `nx.fn_get_signal_dashboard`, `nx.fn_get_my_active_alerts`, `nx.fn_get_my_order_proposals` (sinon les créer en P2.1)
   - Décider : TanStack Query ou useState manuel
   - Décider : Option A (créer `/aujourdhui` ex nihilo) ou B (refonte `/dashboard`)
   - Corriger typo `src/app/mobile/pages.tsx` → `page.tsx`

2. **En P2.3** :
   - Suivre le plan §6 (15 étapes, ~7h30-8h30)
   - Conditionnaliser `/dev` dans NAV (§7.6)

3. **Hors P2.3 (cleanup parallèle)** :
   - Supprimer `src/lib/supabase.ts` (legacy) + migrer toutes ses consommations vers `@/lib/supabase/{client,server}` (§7.1)
   - Refactoring création client inline → utilisation helpers (§7.3)
   - Supprimer route `api/dev/save-checkpoint` + tables `dev_*` (§7.8)
   - Normaliser `Doc/` ↔ `docs/` casing (§7.13)

---

*Fin du rapport — généré par audit statique du commit `2380add` sur branche `main`.*
