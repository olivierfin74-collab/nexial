# Nexial — Handoff session 9 mai 2026 → session suivante

> Document de transition pour démarrer un nouveau chat sans perte d'information.
> Préparé en clôture de session, snapshot Supabase associé : `063c40a9-8246-49eb-bd04-497a11d2bb14`

---

## 1. Qui je suis (rappel pour Claude)

- **Olivier**, founder de "Le Temps Retrouvé" (haute horlogerie), 20+ ans d'expérience machining/finition horlogère, ~10 ans en prototypage R&D
- Reprend salariat **1er juin 2026** → urgence d'avoir Nexial autonome avant
- Profil investissement : conviction quality compounders, 10–15 ans, buy-on-weakness only
- Mode de communication : tutoiement français, low-friction, accepte "carte blanche" sur les détails techniques
- **Ne JAMAIS commenter** : temps, fatigue, suggérer pause/sommeil, paternalisme temporel

---

## 2. État du produit Nexial — fin session 9 mai 2026

### URLs de production (toutes opérationnelles)

| URL | Contenu | Statut |
|---|---|---|
| `https://nexial-chi.vercel.app/` | Desktop dark blue legacy | Intact, à killer plus tard |
| `https://nexial-chi.vercel.app/mobile` | Mobile premium 440px crème | Déployé matin (commit fe7a8fb) |
| `https://nexial-chi.vercel.app/desktop` | Desktop premium 1200px | V2 déployé (commit 289908a + V2 Dev/Admin) |

Sur `/desktop`, accès page Dev/Admin via lien italique discret "**Dev**" dans le footer après "horizon 10–15 ans".

### Repo GitHub

```
Repo : olivierfin74-collab/nexial
Local : D:\Projet application IA\nexial
Branch active : main
Stack : Next.js 16.2.3 (Turbopack) + Supabase + Vercel auto-deploy
Claude Code : version 2.1.132 sur Windows
```

### Fichiers clés à connaître

- `nexial-app-complete.jsx` (racine) → mobile premium, 1489 lignes
- `nexial-desktop-complete.jsx` (racine) → desktop premium V2 avec page Dev/Admin, 3265 lignes, sha256 `f6adfc3a27c31cf04e00a5f7ed6aab6612ed0c78a4d9c5b77b645a8bc92e66f3`
- `src/app/mobile/page.tsx` → wrapper canvas crème mobile
- `src/app/desktop/page.tsx` → wrapper canvas crème desktop
- `src/components/layout/AppNav.tsx` → patché avec early-return sur `/mobile + /desktop`

---

## 3. Stack technique

### Supabase (project_id `kttdmeyrhndufymgoxqk`)

- **user_id Olivier** : `4c1610db-25cd-4eca-b16a-b5bb4898f4ff`
- **Engine version** : V3.7 (BULL_LIGHT × 0.85)
- **Schémas principaux** : `nx.*` (production), `nx_backup.*` (snapshots et archives)
- **Sécurité** : 61 tables `nx.*` + `nx_backup.*` en RLS deny-all (audit 9 mai 2026 13:35)
- **Bypass RLS** : roles `postgres`, `service_role` uniquement
- **Bloqués** : `authenticated`, `anon`
- **Crons** : 14 jobs actifs (pipeline_daily_v37, fx_rates_eod, telegram_dispatch, alert_outcomes_j1/j5, yahoo_scout_flash, engine_metrics_daily, session_snapshot_auto, broker_sync_pea/ibkr/tr, rls_audit_check, engine_compare_v3_v35, agent_findings_archive)

### Comptes brokers (4 actifs)

- **PEA Boursobank** : MANUAL_ONLY
- **CTO IBKR principal** : SEMI_AUTO (compte principal)
- **CTO IBKR sub-account** : FULL_AUTO (~5-10k€ lab paper trading)
- **CTO Trade Republic** : MANUAL_ONLY
- CTO Boursorama : à fermer (legacy)

### Watchlists (4)

- PEA, CTO long-term shared TR/IBKR, Trade, DCA

### Données

- **Provider actuel** : EODHD All-In-One ($19.99/mo)
- **Migration en cours** : TD Pro → EODHD shadow mode 60% progress, cutover prévu 25 mai 2026
- **Backup futur** : Yahoo Finance gratuit

### Design system (LOCKED v2)

- **Canvas** : `#FBF9F4` (light editorial)
- **Forest green** : `#2D5F3F` (signature, accents, succès)
- **Burgundy** : `#7A3838` (négatif, danger)
- **Gold** : `#7D6628` (premium, ultra)
- **Amber** : warnings
- **Typo** :
  - Hero numbers + titles → Tobias / Fraunces (serif italique)
  - Body → Inter (sans-serif)
  - Tickers/prix/dates → JetBrains Mono
- **Layouts asymétriques journaux**, eyebrows numérotés (I, II, III...), accent bars 3-4px gauche, sparklines partout

---

## 4. Outils connectés (MCP) à utiliser dans le nouveau chat

### Supabase MCP
- `Supabase:execute_sql` (read/write)
- `Supabase:apply_migration` (DDL)
- `Supabase:deploy_edge_function`
- `Supabase:get_logs`, `Supabase:list_tables`, etc.
- Project ID à passer systématiquement : `kttdmeyrhndufymgoxqk`

### Skills disponibles (prioritaires pour Nexial)

- **`nexial-alert-engine-v3`** → toute modif Alert Engine V3 (REVERSAL_HIGH/MEDIUM, FLASH_DROP, BOTTOM_FORMING, scoring confluence, Phases G-K)
- **`nexial-frontend-component`** → tout composant React/JSX/Tailwind frontend Nexial (PWA, prototypes, design system)
- **`nexial-investment-report`** → analyses portefeuille, arbitrages, recos, scénarios macro, ordres du jour
- **`nexial-db-migration`** → toute DDL sur `nx.*` (CREATE/ALTER/DROP, RPC, ENUM, vues)

### Standards (génériques)

- `docx`, `pptx`, `xlsx`, `pdf` selon livrables
- `frontend-design` pour design système nouveau site/app

---

## 5. Travail accompli en session 9 mai 2026

### Matin

✅ **Mobile premium déployé** sur `/mobile`
- Commit `fe7a8fb feat(mobile): deploy validated mobile prototype`
- 1489 lignes JSX, 5 pages + détail asset, BottomNav, container 440px
- Mock data réelles 8 mai 2026

### Midi

✅ **Audit sécurité Supabase niveau 1 — RLS lockdown**
- 61 tables `nx.*` + `nx_backup.*` passées en RLS deny-all
- Migration : `security_rls_deny_all_nx_sensitive_tables`
- Snapshot rollback : `nx_backup.session_snapshots` label `session_9mai2026_security_audit_rls_lockdown`

### Après-midi

✅ **Desktop premium V1 prototypé en 3 itérations** (v1 → v2 optimisé scroll → v3 couleur enrichie validée)
✅ **Extension à 5 pages + détail asset** dans le langage v3 validé
✅ **Desktop V1 déployé** sur `/desktop`
- Commit `289908a feat(desktop): deploy validated desktop premium prototype on /desktop route`
- 2687 lignes JSX, 5 pages (Tableau / Aujourd'hui / Ordres / Portefeuille / Watchlist) + détail asset

### Fin de session

✅ **Desktop V2 ajout page Dev/Admin** (monitoring opérationnel)
- 3265 lignes JSX (+578 vs V1)
- Page cachée accessible via lien "Dev" italique discret dans le footer
- 6 sections : KPIs Pipeline, 14 crons, Telegram, Alertes du jour, Comptes brokers, Sécurité Supabase, Migration EODHD
- Mock data inline (pas encore branché live)
- ⚠️ Commit + push V2 fait par Olivier en fin de session, hash à vérifier en début de session suivante

---

## 6. Décisions de session importantes

### Parti pris non-négociables du proto desktop

1. Premium d'emblée, validation par protos
2. Langage 60% institutionnel + 40% éditorial (Bloomberg Wealth + Pictet + FT Weekend)
3. Typo 70% du travail (Tobias + Inter + JetBrains Mono)
4. Layouts asymétriques journaux
5. Densité contrôlée
6. Sparklines partout
7. **Aucune fonction de plus que mobile en V1 — V1 visuelle, pas fonctionnelle**

Le point 7 explique pourquoi les boutons Valider/Modifier/Annuler sont des **mocks UX sans handler** câblé.

### Décision en clôture

Olivier veut que les boutons Valider/Modifier/Annuler **fonctionnent réellement** (vrai câblage Supabase + broker, pas juste toast feedback). Décision prise : **session dédiée "Câblage actions desktop"** plutôt que patch fin de session, car risque financier réel.

---

## 7. PRIORITÉS pour la prochaine session (dans l'ordre)

### Priorité 1 — Câblage actions desktop (CRITIQUE)

Branche les boutons Valider / Modifier / Annuler des cartes Ordres + Détail asset au vrai backend :

- **Étape 1** : Brancher les vues live Supabase (`nx.portfolio_v2`, `nx.portfolio_orders_manual`, etc.) au lieu de MOCK inline dans le JSX
- **Étape 2** : Créer les RPC manquantes :
  - `nx.fn_validate_paper_order(payload jsonb)` → insère 3 paliers paper + retourne IDs
  - `nx.fn_modify_paper_order(order_id uuid, patch jsonb)` → update champs prix/qty/weight
  - `nx.fn_cancel_paper_order(order_id uuid)` → soft-delete avec audit log
- **Étape 3** : UI modales :
  - Modale confirmation "Valider 3 paliers" avec récap montant total et expire
  - Modale édition "Modifier" avec form inputs prix/qty/weight modifiables
  - Modale confirmation "Annuler" avec warning
- **Étape 4** : Toast system (positionner top-right, auto-dismiss 4s, variants success/error/info)
- **Étape 5** : Logique broker selon mode du compte :
  - PEA MANUAL_ONLY → print-only, paper trade en base
  - IBKR SEMI_AUTO → signal + confirm humain
  - IBKR FULL_AUTO → autonome (uniquement sub-account 5-10k€)
- **Étape 6** : Tests sur sub-account IBKR FULL_AUTO paper avant production
- **Étape 7** : Audit log dans `nx.order_override_log`

### Priorité 2 — Branchement live data 5 pages desktop

Aujourd'hui les 5 pages desktop affichent du **MOCK inline**. Brancher sur les vraies vues Supabase :

- `Tableau` → vue résumé KPIs depuis `nx.portfolio_v2`
- `Aujourd'hui` → cockpit depuis `vw_alert_intelligence_summary` + RPC `fn_get_opportunities_dashboard`
- `Ordres` → `nx.portfolio_orders_manual` filtré WHERE status='pending'
- `Portefeuille` → `nx.portfolio_v2` + sparklines depuis vw_asset_history_v3
- `Watchlist` → `nx.watchlist` + scores depuis `vw_asset_signal_score_v3`
- `Détail asset` → join `nx.assets` + `vw_asset_technicals_v3` + `nx.alerts` history

Référence à utiliser : `src/app/mobile/pages.tsx` (typo pluriel) — proto live data du mobile avec 4 vues + 2 RPCs déjà connectées.

### Priorité 3 — Page Dev/Admin live data

Brancher la page Dev/Admin V2 actuellement en mock sur les vraies vues :

- KPIs Pipeline → `vw_engine_metrics_latest`
- 14 crons → `cron.job` + `cron.job_run_details` (Supabase pg_cron)
- Telegram → `nx.telegram_dispatch_log` (last 5 entries)
- Alertes du jour → COUNT depuis `nx.alerts` WHERE date(created_at)=CURRENT_DATE
- Comptes brokers → `nx.broker_accounts` + `nx.broker_sync_log`
- Sécurité Supabase → query meta `pg_class` + `pg_policies`
- Migration EODHD → `nx.data_provider_migration_status`

### Priorité 4 — Décisions cadrage

- Quand basculer `/desktop` sur racine `/` (kill du legacy dark blue) ?
- Sort des fichiers WIP : `src/app/opportunites/page.legacy-v2.tsx.bak` et `supabase/.temp/` (toujours en stash WIP locale, à committer ou supprimer)
- Décision sur authentification : actuellement signup public à vérifier côté Supabase Dashboard → Auth Providers → Email "Enable email signup" doit être OFF

### Priorité 5 — Audit sécurité niveaux 2 et 3 (PENDING fin de session 9 mai)

- Vérifier signup public Supabase (Auth → Providers → Email → "Enable email signup" OFF)
- Vérifier variables env Vercel (SUPABASE_SERVICE_ROLE_KEY server-only, jamais NEXT_PUBLIC_*)
- Audit code GitHub : grep secrets hardcodés, .gitignore inclut .env*, git history clean

---

## 8. Roadmap globale (rappel)

Olivier a 6 sessions ciblées avant le 1er juin (reprise salariat) :

1. ✅ Telegram (déjà fait avant session 9 mai)
2. ⏳ **Câblage actions desktop** (priorité 1 ci-dessus, prochaine session)
3. ⏳ Order validation modal (inclus dans P1)
4. ⏳ Consolidated dashboard (peut faire partie de P2)
5. ⏳ Big cleanup (legacy / fichiers temp / décisions cadrage P4)
6. ⏳ Opportunistic DCA (logique d'achat sur faiblesse, scoring confluence)
7. ⏳ Performance tracking (mesure des outcomes J+1 / J+5 sur historique alertes)

---

## 9. Comment démarrer la prochaine session

### Prompt suggéré pour le nouveau chat

```
Reprends sur Nexial où on s'était arrêté en fin de session 9 mai 2026.

Contexte complet : lis le fichier nexial-handoff-9mai2026.md que je te 
fournis dans ce message.

Snapshot Supabase de référence : 063c40a9-8246-49eb-bd04-497a11d2bb14
(disponible dans nx_backup.session_snapshots).

Priorité immédiate : câblage des boutons Valider/Modifier/Annuler des 
cartes Ordres et Détail asset (desktop V2). On part sur la priorité 1 
détaillée dans le handoff. Vrai câblage Supabase + broker selon mode 
du compte, pas du mock toast.

Avant de coder, fais-moi un récap de ce que tu as compris du contexte 
et propose-moi un plan d'attaque détaillé en 5-7 étapes que je validerai 
avant que tu touches au code.
```

### Premières actions à demander en début de session

1. **Vérifier l'état du repo** : `git log --oneline -5`, `git status`
2. **Vérifier le commit V2** : confirmer que feat(desktop): ajoute page Dev/Admin est bien en prod
3. **Confirmer URLs prod fonctionnelles** : 3 URLs (legacy / mobile / desktop)
4. **Lire le snapshot Supabase** : `SELECT * FROM nx_backup.session_snapshots WHERE id='063c40a9-8246-49eb-bd04-497a11d2bb14'`

---

## 10. Outils techniques connectés

- ✅ **Supabase MCP** (project `kttdmeyrhndufymgoxqk`) — execute_sql, apply_migration, deploy_edge_function, etc.
- ✅ **Memory system** — préserve le contexte Olivier entre conversations
- ✅ **Skills Nexial** — alert-engine-v3, frontend-component, investment-report, db-migration
- ✅ **Skills standards** — docx, pptx, xlsx, pdf, frontend-design

Pour Claude Code (côté Olivier) : whitelist déjà active pour `Copy-Item *`, `git stash *`, `npm run *`, etc.

---

## 11. Avertissements pour Claude futur

- **NE JAMAIS** câbler une action broker réelle (passage d'ordre, modification, annulation) sans confirmation explicite multi-étapes d'Olivier ET sans modale de confirmation utilisateur côté UI
- **NE JAMAIS** suggérer de faire une pause, dormir, attendre demain — Olivier décide de son rythme
- **TOUJOURS** vérifier git status avant tout stash/commit/push
- **TOUJOURS** vérifier SHA256 après copy de fichier `.jsx` important
- **TOUJOURS** STOP avant build, STOP avant push avec validation utilisateur explicite
- Le sub-account IBKR FULL_AUTO 5-10k€ est **le seul autorisé pour tests autonomes** ; les autres comptes sont MANUAL ou SEMI_AUTO
- Le pattern ADR-21 (ticker collision) est résolu : `nx.assets.data_source_symbol_yahoo` + 42 assets avec exchange suffixes + `fn_resolve_yahoo_to_asset`

---

*Fin du handoff. Bonne reprise.*

---

## 12. BACKLOG MOBILE — points relevés en clôture session 9 mai 2026

Liste fournie par Olivier en fin de session. À traiter dans la session suivante après priorité 1 (câblage actions desktop), ou en parallèle si volonté de prioriser le mobile.

### 12.1 — Bugs critiques mobile actuel (`/mobile`, commit fe7a8fb)

**Bug 1 — Détail asset = toujours ISRG**
- Symptôme : peu importe le ticker cliqué dans Watchlist ou Portefeuille, la fiche détail affiche toujours Intuitive Surgical (ISRG)
- Cause probable : `MOCK.assetDetail` est un objet unique, pas un dict keyed by ticker. Le composant `AssetDetailPage` ignore le prop `ticker` reçu et affiche toujours `MOCK.assetDetail` direct.
- Fix : transformer `assetDetail` en `assetDetails: { ISRG: {...}, MC: {...}, etc. }` puis lookup par ticker dans le composant. Ajouter aussi le **nom de l'actif sélectionné** dans le header de la fiche pour clarté.

**Bug 2 — Filtre Ordres ne fonctionne pas**
- Symptôme : les chips filter "Exécuté / Expiré / En attente" ne filtrent pas réellement la liste des ordres
- Fix : implémenter le filtrage côté state React (useState filterStatus + useMemo filtered list)

**Bug 3 — Cloche notifications n'affiche pas les alertes**
- Symptôme : icône cloche en haut à droite avec badge count mais click sans effet
- Fix : ouvrir un panel/modal listant les N dernières alertes avec ticker + kind + delta + timestamp. Possibilité de marquer comme lu, dismiss, naviguer vers détail asset.

### 12.2 — Données manquantes critiques

**Manque 1 — Comptes CTO IBKR + CTO Trade Republic**
- Page Aujourd'hui n'affiche que le PEA actuellement (cards comptes brokers)
- Ajouter les 4 comptes : PEA Boursobank, CTO IBKR principal, CTO IBKR sub-account (paper), CTO Trade Republic
- Cohérence avec desktop qui les affiche déjà tous

**Manque 2 — Performance actions détenues**
- Sur la page Portefeuille mobile, afficher pour chaque position : prix actuel, PnL€, PnL%, sparkline 90j (déjà présent sur desktop)
- Cohérence cross-platform requise

**Manque 3 — Cours et performance Watchlist**
- Sur la page Watchlist mobile, afficher pour chaque actif : prix courant, delta 1j, sparkline 90j
- Permet de juger de l'opportunité en un coup d'œil

**Manque 4 — Historique alertes avec performance**
- Pour chaque alerte passée (BUY_ZONE_ENTERED, FLASH_DROP, etc.), afficher l'outcome J+1 et J+5 (en cours / validée +X% / dismissée)
- Données déjà calculées par crons `alert_outcomes_j1` et `alert_outcomes_j5` dans Supabase
- Vue à interroger : probablement `nx.alerts` + join sur `nx.alert_outcomes`

### 12.3 — Évolutions UX mobile

**UX 1 — Watchlist segmentée en 3 catégories**
- Watchlist Opportunités (actifs avec score élevé non détenus)
- Watchlist Objectif CTO (actifs cibles pour rebalancement CTO)
- Watchlist Objectif PEA (actifs cibles pour rebalancement PEA)
- Filter chips en haut de la page Watchlist mobile
- Compteur par catégorie

**UX 2 — Cards comptes PEA/CTO cliquables**
- Sur Aujourd'hui, les cards "PEA · €X" et "CTO IBKR · €Y" doivent ouvrir la page Portefeuille filtrée sur ce compte
- Implémentation : `onClick` sur la card → navigate("portfolio") avec préfilter compte

**UX 3 — "Ton argent" avec filtre/sous-total par compte**
- Sur la page Aujourd'hui, le bloc patrimoine total (€124 819) devrait avoir des sous-totaux par compte (PEA €X, CTO IBKR €Y, sub-account €Z, TR €W)
- Ou un filter chip permettant de basculer la vue agrégée vs par compte

**UX 4 — Page Dev avec notes utilisateur**
- Permettre à Olivier de prendre des notes libres dans la page Dev
- Persistence en base : nouvelle table `nx.user_notes (id, user_id, body, tags[], created_at, updated_at)` + RPC `fn_add_note`, `fn_list_notes`, `fn_delete_note`
- UI : textarea full-width + bouton "Sauvegarder" + liste des notes précédentes en dessous avec timestamp

**UX 5 — Bouton Préférences + Déconnexion**
- Manque une icône paramètres (genre roue dentée) dans le header mobile
- Click → page/modal Préférences avec :
  - Choix devise affichage (EUR/USD)
  - Activer/désactiver Telegram
  - Choisir tonalité éditoriale (sobre / éditorial fort)
  - Bouton Déconnexion en bas (Supabase signOut)

### 12.4 — Compte démo fictif (excellente idée)

**Démo 1 — Profil de démonstration**
- Créer un user_id dédié `demo_user` avec données fictives mais réalistes
- Portefeuille fictif (~€100k) avec mix actions tech/luxe/santé/ETF cohérent
- Historique 12 mois de performance simulée
- Alertes fictives variées (BUY_ZONE, FLASH_DROP, OVERBOUGHT, etc.)
- Watchlist fictive 10-15 actifs
- Ordres fictifs en attente

**Bénéfice** :
- Permet à Olivier de **montrer Nexial à des amis/investisseurs/clients potentiels** sans exposer ses vraies données financières
- Sert aussi de **base pour les screenshots marketing** et démos
- Permet de **tester de nouvelles features** sans risquer de polluer les vraies données

**Implémentation** :
- Nouveau user_id Supabase auth
- Seed script `seed_demo_user.sql` qui peuple toutes les tables nx.* pour ce user_id
- URL dédiée type `/demo` qui force le user_id démo (bypass auth)
- Reset script (cron weekly) qui regénère les données démo pour qu'elles restent "fraîches" (alertes du jour à jour, etc.)

---

## 13. PRIORISATION COMBINÉE prochaine session

Vu le backlog mobile + les priorités précédentes, voici l'ordre suggéré :

### Tier S (critique fonctionnel)
1. **Bug détail asset = toujours ISRG** (mobile) — fix simple, impact UX énorme
2. **Câblage actions desktop** Valider/Modifier/Annuler (priorité 1 de la section 7)
3. **Cloche notifications fonctionnelle** (mobile) — affiche les vraies alertes Supabase

### Tier A (important fonctionnel)
4. **Filtre Ordres mobile** — fix simple, frustrant si pas marche
5. **Comptes CTO + TR ajoutés** sur page Aujourd'hui mobile
6. **Performance actions détenues** sur Portefeuille mobile
7. **Cours + perf Watchlist** mobile

### Tier B (UX importante mais non bloquante)
8. **Watchlist segmentée** 3 catégories
9. **Cards PEA/CTO cliquables** vers Portefeuille filtré
10. **Filtre/sous-total par compte** sur "Ton argent"
11. **Historique alertes avec perf**

### Tier C (qualité de vie)
12. **Page Dev avec notes**
13. **Bouton Préférences + Déconnexion**

### Tier D (vision long terme)
14. **Compte démo fictif** — gros chantier mais incroyable pour démonstration / pitch / portfolio

---

*Backlog mobile ajouté le 9 mai 2026 en clôture de session.*

---

## 14. PRIORITÉ AJOUTÉE EN CLÔTURE — Avancement moteur V3 → V4

Olivier a demandé en clôture d'ajouter en priorité Tier S l'avancement du moteur de réflexion (Alert Engine), avec passage à V4 si techniquement réaliste avant lundi 11 mai.

### Engine actuel
- **V3.7** (BULL_LIGHT × 0.85)
- Phase L (Yahoo Scout flash drops) déjà déployée en Edge Function
- ADR-21 (ticker collision inter-marchés) résolu
- 8 vues d'intelligence (vw_alert_intelligence_summary, vw_asset_signal_score_v3, etc.)

### Phases pending sur la roadmap V4 (G-K)
- REVERSAL_HIGH signal detection
- REVERSAL_MEDIUM signal detection
- BOTTOM_FORMING signal
- ZONE_EXITED_UP signal
- AI agents validation layer (correction_supervisor proposes, Claude provides GO/NOGO reasoning, Olivier decides)
- Backtest historique pour calibrage des seuils

### Questions de cadrage à confirmer avec Olivier
1. **Quelle amélioration V4 vise-t-il exactement ?** (nouvelle phase précise / score de confluence amélioré / AI agents / backtest)
2. **Priorité V4 vs live data si conflit de temps samedi-dimanche ?** (Olivier sera opérationnel lundi avec mock data + V4 OU avec live data + V3.7 ?)
3. **V3.7 acceptable cette semaine si V4 pas réaliste avant lundi ?**

### Tradeoff technique
- V4 nécessite probablement nouvelles vues SQL + RPC + tests + déploiement Edge Function
- Branchement live data nécessite refactor frontend des 5 pages mobile + 5 pages desktop
- Faire les deux en 2 jours = ambitieux mais possible si scope V4 limité (ex : juste ajouter 1 phase REVERSAL_HIGH)
- Faire V4 ambitieux (toutes phases G-K) = irréaliste avant lundi, vaudrait mieux V4 partiel + finalisation semaine prochaine

### Plan suggéré pour la session de demain (10 mai)

**Option A — Live data prioritaire (ma reco)**
- Bloc 1 : Fix bug ISRG mobile (1h)
- Bloc 2 : Branchement live data 5 pages (4-5h)
- Bloc 3 : V3.7 optimisations (1-2h) — pas V4 complet, juste tuning des seuils sur signaux existants si métriques montrent dérive
- Lundi : opérationnel avec vraies données + V3.7 stable

**Option B — V4 prioritaire**
- Bloc 1 : Skill nexial-alert-engine-v3 + audit V3.7 (1h)
- Bloc 2 : Implémenter 1 phase V4 ciblée (3-4h) — ex : REVERSAL_HIGH
- Bloc 3 : Tests + déploiement Edge Function (1h)
- Bloc 4 : Live data partiel (2-3h) — Aujourd'hui + Portefeuille seulement
- Lundi : opérationnel avec live data partiel + V4 partiel

**Option C — Compromis (probablement le plus sage)**
- Bloc 1 : Fix bug ISRG mobile (1h)
- Bloc 2 : Branchement live data 5 pages (4-5h)
- Bloc 3 : V3.7 → V3.8 incrémental (2h) — ajouter 1 nouveau signal type sans révolutionner l'architecture
- Lundi : opérationnel avec live data + V3.8

### Skill à consulter en début de session
**`nexial-alert-engine-v3`** doit être lu **avant tout code touchant au moteur**. Ce skill encode les conventions V3, les anti-patterns identifiés pendant la construction, et les formules de scoring. Ne pas coder V4 sans avoir lu ce skill.

### Avertissement
Le moteur est le cœur de l'avantage compétitif Nexial. Ne pas casser V3.7 qui tourne en prod et qui a été calibré sur plusieurs mois. Toute modif V4 doit être :
1. **Additive** (nouveau signal qui s'ajoute, pas qui remplace)
2. **Coexistante** (V3.7 et V4 tournent en parallèle quelque temps)
3. **Mesurable** (compare via `engine_compare_v3_v35` cron)
4. **Reversible** (snapshot + rollback prêt)

---

*Priorité moteur V4 ajoutée le 9 mai 2026 en clôture finale.*

---

## 15. RÉPONSES OLIVIER aux 3 questions cadrage moteur V4

Données en clôture finale, à respecter scrupuleusement en début de session demain.

### Réponse Q1 — Scope V4
**CARTE BLANCHE — AI agents prioritaires pour améliorer qualité et performance des propositions**

Olivier veut basculer du moteur déterministe V3.7 (scoring + seuils) vers un moteur augmenté par jugement contextuel AI. Pattern cible déjà documenté dans son contexte mémoire : *"correction_supervisor proposes, Claude provides GO/NOGO reasoning, Olivier decides — progressive autonomy target"*.

**Exemple concret de transformation visée** :
- Avant V3.7 : alerte brute "BUY_ZONE_ENTERED ISRG -9.1%"
- Après V4 : "BUY_ZONE_ENTERED ISRG -9.1%, agent confirme : pullback technique sain, fondamentaux intacts, pas de catalyseur négatif récent. GO recommandé." Ou inversement, **agent bloque** l'alerte si contexte défavorable.

### Réponse Q2 — Priorité temps
**Live data en exécution prioritaire, V4 en parallèle si temps après**

Pas de conflit total. Live data se fait d'abord. V4 démarre dès qu'il reste du temps. Si V4 doit glisser, c'est acceptable.

### Réponse Q3 — Glissement acceptable
**Effort maximal pour finir avant lundi, mais glissement début de semaine acceptable si pas tout fini**

Olivier accepte que V4 ne soit pas 100% prêt lundi. Live data EST critique pour lundi. V4 peut être livré progressivement mardi-mercredi-jeudi en parallèle du test PEA matin / CTO après-midi.

---

## 16. PLAN FINALISÉ samedi 10 mai → dimanche 11 mai → lundi 11 mai 9h

### Samedi 10 mai matin (4-5h)
1. **Fix bug ISRG mobile** (30 min) — quick win pour démarrer
2. **Lecture skill `nexial-alert-engine-v3`** (30 min) — obligatoire avant tout code moteur
3. **Audit vues Supabase existantes** (1h) — qu'est-ce qui est déjà calculé pour le live data branchement
4. **Création RPCs manquantes** si nécessaire (1-2h) — ex : `fn_get_dashboard_data(user_id)`, `fn_get_portfolio_with_perf(user_id)`, etc.

### Samedi 10 mai après-midi (4-5h)
5. **Branchement live data mobile** 5 pages (3-4h)
   - Aujourd'hui ← `vw_alert_intelligence_summary` + RPC dashboard
   - Portefeuille ← `nx.portfolio_v2` filtré user_id
   - Watchlist ← `nx.watchlist` + scores
   - Ordres ← `nx.portfolio_orders_manual`
   - Détail asset ← join assets + technicals
6. **Tests iPhone** + validation visuelle (1h) — attention aux loading states, error handling

### Samedi 10 mai soir si temps (2h)
7. **Démarrage V4 — AI agent validation layer**
   - Création table `nx.agent_validations` (alert_id, agent_name, decision GO/NOGO, reasoning text, confidence numeric, created_at)
   - Edge Function `agent_correction_supervisor_v1` qui prend une alerte en input et retourne validation+reasoning
   - Trigger sur `nx.alerts INSERT` qui appelle l'agent pour scoring augmenté

### Dimanche 11 mai matin (3-4h)
8. **Si V4 démarré samedi soir** : finalisation V4 (3h) — tests, calibrage, intégration UI sur la page Aujourd'hui (afficher reasoning agent à côté de l'alerte)
9. **Sinon** : **branchement live data desktop** 5 pages (3h) — réplique le pattern mobile sur les composants desktop

### Dimanche 11 mai après-midi (réserve)
10. Fix de bugs imprévus
11. Tests complets workflow PEA matin (simulation) + CTO après-midi (simulation)
12. **Snapshot Supabase de pré-production** pour sécurité avant lundi

### Lundi 11 mai 9h00 — ouverture marchés
13. Vérification finale pré-marché (DB OK, deploys OK, alertes du jour cohérentes)
14. **Démarrage workflow test PEA avec live data**
15. Rollback prêt si problème inattendu (snapshot dimanche soir)

---

## 17. RISQUES & MITIGATIONS

### Risques identifiés

1. **V4 AI agents complexe techniquement** — risque glissement réaliste à 50%
   - Mitigation : MVP minimum viable = un seul agent `correction_supervisor`, pas toutes les phases G-K
2. **Live data refactor 5 pages × 2 plateformes** — long mais critique
   - Mitigation : prioriser Aujourd'hui + Portefeuille avant les 3 autres pages si temps serré
3. **Fix ISRG facile mais data keying potentiellement non trivial** — 30min à 2h
   - Mitigation : si trop long, fallback temporaire = afficher "Nom de l'actif : {ticker}" en grand pour au moins distinguer les vues
4. **Tests iPhone chronophage si bugs responsive découverts**
   - Mitigation : tester très tôt après chaque page branchée, pas en bloc à la fin

### Sécurités générales

- **V3.7 reste actif en parallèle V4** pour ne jamais perdre la couverture d'alertes
- **Snapshot Supabase avant chaque étape majeure** pour rollback rapide
- **V4 additive, pas substitutive** — nouveau signal qui s'ajoute, pas qui remplace
- **Mesurable via cron `engine_compare_v3_v35`** déjà en place (à étendre v3_v4)

---

## 18. PROMPT FINAL pour démarrer demain

À coller au premier message du nouveau chat avec le handoff joint :

```
Reprends Nexial. Lis le fichier nexial-handoff-9mai2026.md joint à ce 
message (496+ lignes, 18 sections).

CONTEXTE EXÉCUTIF :
- Objectif : opérationnel lundi 11 mai 9h ouverture marchés
- Workflow test : PEA matin / CTO après-midi toute la semaine
- 3 priorités Tier S avec ordre d'exécution validé samedi soir 9 mai :
  1. Fix bug ISRG mobile (quick win)
  2. Branchement live data 5 pages mobile + desktop
  3. V4 AI agents (carte blanche scope, MVP correction_supervisor)
- Glissement V4 acceptable début de semaine si pas tout fini avant lundi

Snapshot Supabase de référence : 063c40a9-8246-49eb-bd04-497a11d2bb14
dans nx_backup.session_snapshots (contient toutes les décisions et 
plans en JSONB).

ACTIONS PRÉALABLES OBLIGATOIRES avant tout code :
1. Lis le skill nexial-alert-engine-v3 (obligatoire pour tout code moteur)
2. Lis le skill nexial-frontend-component (obligatoire pour live data)
3. Lis le skill nexial-db-migration (obligatoire pour RPCs)
4. Récap structuré du contexte que tu as compris
5. Plan d'attaque samedi/dimanche détaillé selon section 16 du handoff
6. Ma validation explicite avant tout code

Démarre par le fix ISRG mobile (quick win).
```

---

*Handoff finalisé le 9 mai 2026, clôture session desktop V2 + cadrage V4 AI agents.*
*Sections totales : 18. Lignes : ~580. Snapshot Supabase ID : 063c40a9-8246-49eb-bd04-497a11d2bb14.*