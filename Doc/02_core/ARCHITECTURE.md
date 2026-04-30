# NEXIAL — ARCHITECTURE

## Principe global

Nexial est un système en couches :

DATA → ANALYSE → DÉCISION → UI → EXECUTION → FEEDBACK

---

## Data Layer

Source portefeuille :
- vw_portfolio_positions_ui_v2

Source prix marché :
- vw_latest_real_prices_clean_v1

Source patrimoine :
- vw_patrimoine_total_general_eur_v1

---

## Decision Layer

Source logique décision :
- vw_invest_now_output_v4

Source UI officielle :
- vw_invest_ui_v1

Règle :
- les pages ne lisent pas directement les vues brutes de décision
- elles lisent les vues UI stabilisées

---

## UI Layer

Navigation cible :

- Dashboard → décision globale
- Actions → exécution top 3
- Portefeuille → positions
- Allocation → structure
- Marché → exploration
- Watchlist → timing
- Alertes → triggers
- Préférences → configuration

---

## Integrity Layer

Fichier de référence :
- 02_core/INTEGRITY_RULES.md

Objectif :
- empêcher les duplications
- éviter les anciennes vues
- garantir la cohérence prix / portefeuille / décision

---

## Restart Layer

Fichiers :
- 01_state/CURRENT_STATE.md
- 01_state/NEXT_ACTION.md
- 01_state/RESTART_PROMPT.md

Objectif :
- reprise sans perte
- une seule prochaine tâche
- aucun drift

---

## Règle critique

Si actif en portefeuille → utiliser prix portefeuille.  
Sinon → utiliser prix marché.  
Si prix non fiable → SURVEILLANCE.

---

## Objectif architecture

- une source de vérité par domaine
- aucune logique critique dupliquée
- décisions cohérentes
- reprise fiable
- scalabilité produit

## Product Direction — Premium Layer

Nexial = Decision Engine + Execution System

Layers:

1. Data Layer
2. Decision Engine (scoring + timing)
3. Routing Layer (account / broker)
4. Execution Layer (real / virtual)
5. Tracking Layer (performance / logs)
6. UX Layer (progressive complexity)

Key principle:
"One decision at a time"

## Premium Product Architecture — Added Priorities

Nexial doit évoluer vers un système complet :

1. Decision Engine
   - BUY / WAIT / WATCH
   - Score Nexial
   - Top 3 opportunités

2. Execution Safety Layer
   - contrôle data
   - contrôle prix
   - blocage EXECUTE si condition non propre

3. Order Monitoring Layer
   - suivi ordres actifs
   - prix limite
   - écart prix actuel / limite
   - statut ordre
   - alerte si ordre obsolète

4. Premarket Protection Layer
   - analyse overnight / premarket
   - détection gap important
   - recommandation annuler / modifier / attendre
   - aucune exécution automatique sans validation

5. Universe Scan Layer
   - 100 à 150 actifs mondiaux
   - scan opportunités hors watchlist
   - score relatif
   - proposition d’entrée watchlist si opportunité supérieure

6. Broker Routing Layer
   - PEA / CTO
   - devise
   - broker
   - fiscalité
   - cash disponible

7. User Experience Layer
   - débutant : simple, guidé
   - intermédiaire : score + zones
   - avancé : détails moteur + logs

Key principle:
Nexial must not only tell what to buy.
It must protect the user from bad execution and detect superior opportunities.