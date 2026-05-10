# RESTART · NEXIAL

> **ENTRY POINT pour Claude.** Lis ce fichier en premier à chaque nouvelle session.
> Le markdown narratif n'est pas la source de vérité — la base Supabase l'est.

---

## Étape 1 — Charger l'état machine (source de vérité)

```sql
-- Via Supabase MCP (project_id: kttdmeyrhndufymgoxqk)
SELECT * FROM nx.fn_get_latest_session_state();
```

Ce que tu reçois : `git_head_sha`, `active_sprint`, `sprint_progress`, `tier_s_open`, `tier_a_open`, `engine_version`, `v4_status`, `pending_decisions`, `free_notes`, `age_minutes`.

**Si `age_minutes > 1440` (24h)** : flag staleness à Olivier, demande capture fraîche avant de coder.

---

## Étape 2 — Vérifier le drift git

```bash
# Côté Olivier (Claude Code Windows)
git rev-parse HEAD
git log --oneline -5
git status --short
```

**Compare** `git rev-parse HEAD` avec `git_head_sha` retourné à l'étape 1.

- **Identique** → état aligné, continue.
- **Différent** → drift. Demande à Olivier les commits intervenus depuis :
  ```bash
  git log <sha_enregistre>..HEAD --oneline
  ```
  Et **mets à jour** ta compréhension avant tout code.

---

## Étape 3 — Vérifier la prod

3 routes critiques :
- `https://nexial-chi.vercel.app/` (legacy, à killer)
- `https://nexial-chi.vercel.app/mobile` (premium 440px)
- `https://nexial-chi.vercel.app/desktop` (premium 1200px + Dev/Admin)

Si l'une est KO en début de session → priorité absolue avant tout autre travail.

---

## Étape 4 — Lire les décisions pendantes et notes libres

```sql
SELECT pending_decisions, free_notes 
FROM nx.fn_get_latest_session_state();
```

Lis chaque `pending_decisions[i].q` et le `decision` ou `status`. Si quelque chose est `awaiting_explicit`, demande à Olivier avant de coder.

---

## Étape 5 — Annoncer l'état + plan (≤ 200 mots)

Format strict :

```
État vérifié :
- HEAD : {sha} ({date_dernier_commit})
- Sprint actif : {active_sprint}
- Prod : {OK | KO route_x}
- V4 : {v4_status}

Tier S ouvert ({nb} items) :
- {id} · {label} · ~{est_min}min
- ...

Tier A ouvert ({nb}) : {liste compacte}

Décisions pendantes :
- {q} → {decision ou awaiting}

Plan proposé :
1. ...
2. ...

Carte blanche ou ajustement ?
```

---

## Étape 6 — En fin de session : capturer

**Avant de fermer**, Claude appelle `nx.fn_capture_session_state(...)` avec :
- `p_session_label` : `session_{YYYYMMDD}_{morning|afternoon|evening}_{topic}`
- `p_git_head_sha` : SHA après push (demande à Olivier)
- `p_git_commits_last_5` : depuis `git log --oneline -5`
- `p_git_dirty_files` : depuis `git status --short`
- `p_active_sprint` : nom du sprint en cours
- `p_sprint_progress` : `{"done":[...], "todo":[...], "blocked":[...]}`
- `p_tier_s_open`, `p_tier_a_open` : items restants
- `p_engine_version`, `p_v4_status`
- `p_pending_decisions` : array d'objets `{q, decision, status}`
- `p_free_notes` : 1-3 phrases sur ce qui s'est passé / ce qui a été décidé

C'est ça, le handoff. **Une RPC, 5 secondes, traçable, queryable, hashable.**

---

## Anti-patterns à éviter

- ❌ Se fier au handoff narratif markdown s'il existe (probablement périmé)
- ❌ Coder sans avoir lu `nx.fn_get_latest_session_state()` d'abord
- ❌ Passer plus de 5 messages à reconstruire le contexte au lieu d'interroger la DB
- ❌ Capturer en fin de session avec un sprint_progress vide (toujours remplir done/todo)
- ❌ Oublier `p_git_head_sha` (champ obligatoire, sans lui pas de drift detection)

---

## Schéma rapide

```
Olivier ouvre nouveau chat
  ↓
"Reprends Nexial, lis .session-handoff/RESTART.md"
  ↓
Claude → nx.fn_get_latest_session_state()    [étape 1]
  ↓
Claude demande à Olivier git rev-parse HEAD  [étape 2]
  ↓
Claude vérifie 3 URLs prod                   [étape 3]
  ↓
Claude lit pending_decisions                  [étape 4]
  ↓
Claude annonce état + plan ≤ 200 mots        [étape 5]
  ↓
Olivier valide → travail
  ↓
Fin de session : Claude capture              [étape 6]
```

---

*Système créé le 10 mai 2026, session bootstrap après drift handoff 9 mai.*
*Migration : `create_session_state_capture_system_v1`.*
*Bootstrap row ID : `0de6ec7e-6f77-48e4-9f7f-8af2e8f60a9c`.*
