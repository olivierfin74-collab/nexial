# NEXIAL_STATE

Last update: 2026-04-24T22:26:58.669Z

---

# Session Update — 2026-04-25

## Contexte
Objectif : passer de moteur technique à produit utilisable (Invest Now)

---

## Frontend

- Mise en place Next.js app
- Création écran Nexial Invest Now
- UX simplifiée (1 décision = 1 action)
- Bouton J’ACHÈTE opérationnel
- Ajout Historique + Performance
- Correction layout (affichage multi-blocs)

---

## Backend (Supabase)

- Connexion Supabase frontend OK
- Intégration vw_invest_now_engine_v1
- Création insertion execution_queue_v1 depuis UI
- Implémentation anti-spam (UI + DB)
- Ajout champ mode (INVEST_NOW vs EXPERT)

---

## Data

- Historique isolé via vw_invest_now_history_v1
- Performance isolée via vw_invest_now_performance_v1
- Correction cohérence UI ↔ DB (bug quantité fixé)

---

## DevOps

- Git installé et configuré
- Premier commit projet réalisé
- Structure Doc Nexial utilisée (state / changelog / archive)

---

## Résultat

- App fonctionnelle (localhost)
- Flux complet validé :
  décision → affichage → action → ordre → tracking

---

## Limites actuelles

- Watchlists non segmentées (PEA / CTO)
- Mode expert non implémenté
- Allocation globale non optimisée
- Pas de logique d’arbitrage
- Pas de gestion multi-actifs

---

## Prochaine étape

- Création watchlists Olivier (PEA / CTO)
- Construction Strategy Engine (top 3 opportunités)
- Routing capital intelligent (PEA vs CTO)

---

## Insight clé

- Invest Now validé pour profil débutant
- Produit utilisable immédiatement
- Base solide pour stratégie avancée

---
## External Integrations

- Twelve Data API : configurée
- Clé API : renseignée et testée
- Connexion API : validée
- Récupération automatique des cours actifs : NON FAITE
- Insertion automatique dans price_quotes_v1 : NON FAITE

---

## Market Data Status

- Source cible : Twelve Data
- Objectif : alimenter price_quotes_v1 avec les cours réels
- État actuel : connexion validée mais price engine non implémenté
- Prochaine étape verrouillée : construire le script de récupération des prix actifs PEA / CTO

---

## Next Locked Step

- GO PRICE ENGINE
- Lire la clé Twelve Data existante
- Mapper les tickers PEA / CTO
- Récupérer les derniers prix via Twelve Data
- Insérer les prix dans price_quotes_v1
- Recalculer vw_asset_market_metrics_v2
- Tester Opportunity Desk sur prix réels
---

## Restart instruction

User says:
on reprend Nexial

Assistant must:
1. read this state
2. confirm phase
3. confirm current step
4. say: No drift detected, proceeding with locked step
5. execute only the locked next action

END
