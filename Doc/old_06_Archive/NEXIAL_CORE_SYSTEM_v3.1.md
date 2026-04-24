NEXIAL — CORE PROMPT v3.1 (EXECUTION SNAPSHOT)
STATUS

Stable – Invest Now flow + Allocation + Tax + FX opérationnels

🎯 OBJECTIF PRODUIT

Nexial est un moteur de décision qui répond à :

👉 “Que dois-je faire maintenant avec mon capital ?”

🧠 POSITIONNEMENT

Nexial optimise :

performance marché (alpha)
fiscalité (PEA vs CTO)
devise (FX timing)
allocation multi-stratégies
🏗 ARCHITECTURE
CORE ENGINES
Arbitrage → vw_arbitrage_engine_v4
Sizing → vw_position_sizing_engine_v2
Timing → vw_timing_engine_v1
Explanation → vw_arbitrage_explanations_v1
Feedback → user_feedback
INVESTMENT FLOW
investment_requests
vw_investment_intent_router_v1
vw_bucket_allocation_v1
vw_investment_allocation_plan_v1
vw_invest_now_output_v2
vw_invest_now_output_v3
MULTI-BUCKET SYSTEM

user_investment_buckets :

OPPORTUNITY
DCA
LONG_TERM
CASH
TAX ENGINE
tax_scenarios
vw_pea_advisor_v1
vw_tax_projection_v1

France :

CTO = 31.4%
PEA = 18.6% (après 5 ans)
FX ENGINE
fx_rate_snapshots
vw_fx_latest_v1
vw_fx_signal_v1

Logique :

EUR/USD élevé → USD faible → opportunité
EUR/USD moyen → conversion optionnelle
EUR/USD bas → attendre
ALPHA + TAX + FX ENGINE
vw_alpha_tax_fx_engine_v1

Formule :

net_score = alpha_score + fx_score - tax_penalty

📊 OUTPUT FINAL

vw_invest_now_output_v3 :

À faire maintenant
À programmer
À construire
À conserver
fiscalité
projections
recommandation PEA / CTO
🧠 ÉTAT ACTUEL

✔ Allocation multi-poches OK
✔ Opportunité priorisée OK
✔ Sizing multi-devise OK
✔ Fiscalité intégrée OK
✔ FX signal OK
✔ Output UX lisible OK

⚠️ LIMITES ACTUELLES
FX = statique (pas encore dynamique / historique)
alpha_score = heuristique
pas encore de learning utilisateur
pas encore de tracking d’exécution
🚀 PRIORITÉS
PRIORITÉ #1

Execution tracking

PRIORITÉ #2

FX conversion proposal (intégré dans Invest Now)

PRIORITÉ #3

Sizing v3 (multi-idées)

PRIORITÉ #4

Amélioration alpha_score

🎯 PROCHAIN OBJECTIF

👉 Construire une boucle :

Decision → Execution → Feedback → Learning

🧠 RÈGLE CLÉ

Toujours optimiser :

👉 rendement réel net = performance + FX – fiscalité

END SNAPSHOT