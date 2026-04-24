# NEXIAL CORE — v5.2 (FINAL)

## OBJECTIF

Système autonome de **surveillance + décision + exécution**.
L’utilisateur ne suit plus le marché ; Nexial restitue **0 à 3 actions max**, **exécutables immédiatement**.

---

## RÈGLES ABSOLUES

* 1 réponse = exécutable immédiatement
* 0 interprétation / 0 correction
* max 3 actions
* pas d’achat sans edge réel
* pas d’achat sur breakout
* si doute ou options proches → **NO ACTION**
* si l’edge ≤ cash → **NO ACTION**

Principe : **Pas d’edge clair = pas d’action**

---

## PRODUIT (SHIFT)

Nexial n’analyse pas pour informer.
Nexial **surveille, filtre, décide, propose**.

Entrées suivies :

* Portefeuille (PEA / CTO)
* Watchlists
* Ordres actifs
* Régime de marché

Sortie :

* 0–3 **opportunités**
* 0–3 **risques**
* 0–3 **actions** (BUY / HOLD / REDUCE / WAIT)

---

## MONITORING ENGINE

Surveille en continu :

* positions, watchlists, ordres actifs
* prix / variation / drawdown / zones
* régime de marché

### Statut par actif

* OK | WATCH | ACTION | URGENT

### Priorité

* P0 rien | P1 surveillance | P2 action | P3 urgent

---

## RHYTHM ENGINE

* **DAILY** : scan + décisions
* **WEEKLY** : synthèse + changements significatifs
* **EVENT-DRIVEN** : alertes uniquement

Le rythme pilote : fréquence de scan, détail, seuils d’alerte.

---

## DECISION STACK (ordre strict)

### 1) Market Regime Engine

Sortie : **BULL / NEUTRAL / WEAK / STRESS**
→ ajuste agressivité & sélectivité

### 2) Opportunity Engine

Score :

* qualité, croissance, momentum, valorisation
  → shortlist uniquement

### 3) Opportunity Cost Engine (CRITIQUE)

Question :
**“meilleur usage de ce capital maintenant ?”**
Compare : alternatives, portefeuille, cash
→ si NON : **REJECT**

### 4) Timing Engine

Détecte :

* vrai pullback / faux pullback / breakout (interdit)
  → **BUY / WAIT / REJECT**

### 5) Allocation Engine

Décide :

* montant, nb d’ordres, compte (PEA/CTO), surpondération

### 6) CIO Final Decision Layer

Valide :

* edge réel, meilleur choix, cohérence, timing
  → **BUY (ordre précis)** OU **NO ACTION**

---

## ENTRY PLAN ENGINE

Génère un plan **exécutable** :

* actif, compte, quantité/montant
* **prix limite**, validité
* justification courte
* priorité

Supporte :

* entrée unique
* **multi-niveaux (Z1/Z2/Z3)**
* **order pack**

---

## ORDER PACK SYSTEM

* plusieurs ordres liés
* validation **1 clic**
* statut global
* suivi de cohérence

---

## ORDER WATCH ENGINE

Les ordres sont **vivants**.

Surveille :

* marché, actif, régime, score, alternatives

Actions :

* **KEEP / AMEND / CANCEL / ALERT**

Triggers :

* retournement, news majeure, volatilité anormale
* ordre trop ancien, spread anormal
* perte d’edge, meilleure opportunité

---

## ALERT ENGINED:\Projet application IA\nexial\Doc\04_update

Alertes **rares & actionnables** :

1. exécution
2. entrée en zone
3. retournement
4. ordre obsolète / à revoir
5. meilleure opportunité

---

## MARKET DATA STRATEGY

Principe :
**quasi temps réel intelligent > tick-by-tick**

Données :

* last, bid/ask, volume, high/low, variation
* distance aux zones, drawdown, régime

Fréquences :

* ordres / zones : **10–30s**
* portefeuille : **~1 min**
* watchlist : **1–5 min**

---

## PEA vs CTO

### PEA

* long terme, faible fréquence
* sélectivité élevée, buy sur repli
* priorité qualité / structure

### CTO

* opportuniste, plus dynamique
* sensibilité momentum & timing
* arbitrage plus rapide

---

## OUTPUT UTILISATEUR (FORMAT)

### Statut

* régime marché + niveau d’action

### Opportunités (0–3)

### Risques (0–3)

### Actions (0–3)

Chaque action :

* actif | compte | **ordre (prix limite)** | validité | justification

---

## STACK TECHNIQUE

* **Supabase / PostgreSQL** (SQL-first)
* **Temporal** (workflows durables)
* **Polygon** (data US / CTO)
* **IBKR API** (portefeuille + exécution)
* **OpenAI Agents** (support : synthèse / contrôle)

Règle :
l’IA **ne décide pas seule**.

---

## OBJECTIF BETA (MAI)

* suivi autonome PEA/CTO + watchlists
* décisions selon rythme choisi
* ordres exploitables
* surveillance des ordres
* alertes pertinentes

---

## OBJECTIF FINAL

Moins de décisions, meilleure performance, autonomie totale.

---

# D) AUTONOMOUS MONITORING & DECISION ENGINE (ADDED v5.2)

## D.1 PRODUCT EVOLUTION

Nexial evolves from:

* decision-support system

To:

* autonomous monitoring + decision engine

User no longer follows markets.

Nexial monitors:

* portfolio
* watchlists
* active orders
* market regime

And outputs only:

* relevant actions

---

## D.2 CORE OUTPUT RULE

Nexial must produce:

* 1 answer
* directly executable
* no interpretation
* no refinement

Rule:

**First shot = correct**

---

## D.3 ACTION LIMIT

* max 3 actions
* max 3 opportunities
* max 3 risks

If no strong opportunity:

→ **NO ACTION**

---

## D.4 MONITORING ENGINE

Continuously tracks:

* PEA positions
* CTO positions
* watchlists
* active orders
* market regime

Each asset receives:

### Status

* OK
* WATCH
* ACTION
* URGENT

### Priority

* P0
* P1
* P2
* P3

---

## D.5 RHYTHM ENGINE

Supports:

### DAILY

* full scan
* decisions allowed

### WEEKLY

* consolidated review
* major changes only

### EVENT-DRIVEN

* alerts only
* no periodic output

---

## D.6 DECISION ENGINE HARDENING

Problem:

* too many adjustments
* too much refinement
* slow execution

Solution:

* deterministic
* constrained
* binary

---

## D.7 DECISION STACK

### 1. Market Regime

* BULL / NEUTRAL / WEAK / STRESS

### 2. Opportunity Engine

* shortlist only strong candidates

### 3. Opportunity Cost Engine

Question:

“best use of this capital now?”

If NO:
→ reject

### 4. Timing Engine

* pullback only
* breakout forbidden

### 5. Allocation Engine

* sizing
* priority
* cash usage

### 6. CIO Final Decision

Final output:

* BUY (precise order)
  OR
* NO ACTION

Rule:

If doubt → NO ACTION

---

## D.8 ENTRY PLAN

Must generate:

* asset
* account (PEA / CTO)
* quantity
* limit price
* validity

Supports:

* single order
* multi-level orders

---

## D.9 ORDER WATCH ENGINE

Orders are dynamic objects.

Must detect:

* market reversal
* asset breakdown
* better opportunity
* outdated order

Actions:

* KEEP
* MODIFY
* CANCEL
* ALERT

---

## D.10 ALERT SYSTEM

Only action-driven alerts:

* execution
* entry zone
* reversal
* obsolete order
* better opportunity

No noise allowed.

---

## D.11 MARKET DATA STRATEGY

No tick-by-tick.

Use:

* price
* bid/ask
* volume
* zones
* drawdown

Frequency:

* critical zones: 10–30s
* portfolio: 1 min
* watchlist: 1–5 min

---

## D.12 STACK EXTENSION

Confirmed stack:

* PostgreSQL / Supabase
* Temporal
* Polygon
* IBKR API
* OpenAI Agents

AI role:

* support only
* never sole decision maker

---

## D.13 PEA VS CTO

### PEA

* long-term
* low frequency
* high selectivity

### CTO

* opportunistic
* dynamic
* faster rotation

---

## D.14 FINAL OBJECTIVE

User should reach:

“I no longer need to follow markets”

Nexial replaces monitoring and decision layer.

---

## D.15 FINAL RULE

**No edge = no action**

---
