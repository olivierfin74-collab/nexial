# NEXIAL — CURRENT STATE

Last update: 2026-05-02

## Phase actuelle
Execution + Alerts + Mobile + Learning + Adaptive Decision Engine

## État produit
Nexial dispose maintenant d’une boucle produit complète :

DATA → DECISION → EXECUTION → ALERT → MOBILE ACTION → CONFIRMATION → PORTFOLIO → LEARNING → ADAPTIVE DECISION

## Modules validés

### Portfolio / Patrimoine
- `vw_patrimoine_global_v2` validée
- Patrimoine total consolidé : positions + cash + ordres engagés
- Cash manuel intégré
- Statut global Nexial disponible
- Page `/patrimoine` enrichie avec vision performance, cash, ordres et alertes

### Alerts
- Alert engine isolé sur `alerts_app_v1`
- Ancien `alerts_v1` non utilisé pour le nouveau flux mobile
- `vw_alerts_active_v1` validée
- `vw_alerts_mobile_badge_v1` validée
- Page `/alerts` fusionnée en version premium, basée sur :
  - `vw_alerts_active_v1`
  - `vw_alerts_mobile_badge_v1`
  - `vw_execution_orders_ui_v1`
  - `vw_mobile_push_outbox_ui_v1`

### Mobile
- Device engine créé :
  - `user_devices_v1`
  - `mobile_push_outbox_v1`
  - `vw_user_active_devices_v1`
  - `vw_push_alert_candidates_v1`
  - `fn_queue_push_alerts_v1`
  - `fn_run_mobile_notification_engine_v1`
- Page `/mobile` créée comme command center mobile :
  - patrimoine
  - statut Nexial
  - action prioritaire
  - alertes
  - ordres
  - cash disponible

### Learning Engine
- Learning Engine V2 installé
- Objectif :
  - tracking décisions
  - tracking exécutions
  - suivi marché
  - performance
  - score adjustment
- Fonction corrigée :
  - `fn_run_adaptive_decision_engine_v1`
- Résultat validé :
  - `executions_loaded = 0`
  - `market_updated = 0`
  - `performance_computed = 0`
  - `adaptive_assets = 11`
  - `buy_ready = 4`
- Les zéros sont normaux à ce stade : historique learning encore non alimenté par exécutions confirmées.

### Adaptive Decision Engine
- `vw_learning_asset_summary_v1`
- `vw_nexial_signal_adaptive_v1`
- `vw_allocation_decision_adaptive_v1`
- `vw_dca_final_decision_adaptive_v1`
- `vw_actions_adaptive_top3_v1`
- `vw_adaptive_decision_dashboard_v1`
- `fn_run_adaptive_decision_engine_v1`

Résultat dashboard validé :
- tracked_assets : 11
- avg_adaptive_score : 87.82
- avg_base_score : 87.82
- avg_learning_delta : 0.00
- buy_ready_count : 4
- watch_count : 4
- blocked_data_count : 3

### Actions
- Page `/actions` fusionnée en version premium avec :
  - conservation de l’UI existante
  - ajout Adaptive Engine
  - score adaptatif
  - learning signal
  - adaptive reason
  - bouton renommé : “Créer l’ordre”
- Sources :
  - `vw_invest_ui_v1`
  - `vw_actions_adaptive_top3_v1`

### Auto Execution Suggestion
- `vw_auto_execution_candidates_v1`
- `vw_auto_execution_sizing_v1`
- `vw_auto_execution_suggestions_v1`
- `vw_auto_execution_dashboard_v1`
- `fn_create_execution_order_from_auto_suggestion_v1`
- `fn_create_top_auto_execution_orders_v1`

Vue corrigée après erreur alias SQL sur `suggested_amount_final`.

Résultat actuel :
- NVDA : order ready, 4 titres, limite 196.44, montant 785.76
- MSFT : order ready, 1 titre, limite 425.07, montant 425.07
- ASML : bloqué car trop cher pour sizing, quantité 0

## Décision produit validée
Nexial doit rester :
- premium
- mobile-first pour action
- web-first pour analyse
- strictement orienté exécution
- une action = une décision
- aucun ordre marché
- quantité entière
- pas d’achat breakout
- sizing progressif sauf opportunité exceptionnelle

## Point de vigilance
Ne pas écraser les fichiers UI existants sans fusion.
Toujours demander le fichier actuel avant modification d’une page existante critique.
## Beta Preparation

Status:
- Portfolio engine stable
- Execution integrated
- Data quality corrected
- Mobile access validated

In progress:
- Onboarding simplification
- Feedback system integration

Next milestone:
Beta launch — 11 May

Primary objective:
Validate user understanding and usage