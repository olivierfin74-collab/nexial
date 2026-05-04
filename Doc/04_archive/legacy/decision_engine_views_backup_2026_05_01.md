# Decision Engine Legacy Views Backup — 2026-05-01

## Contexte

Backup des anciennes vues dépendantes de `vw_decision_engine_v1` avant remplacement par le nouveau Decision Engine v1 full master.

Ces vues sont legacy et basées sur l’ancien pipeline :
- `vw_opportunity_ranking_v1`
- `asset_total_score`
- `regime_adjusted_score`
- `opportunity_rank`

Elles ne sont plus compatibles avec le nouveau moteur :
- `vw_asset_decision_score_v1`
- `vw_portfolio_context_v1`
- `vw_capital_efficiency_v1`
- `vw_decision_engine_v1`

## Vues archivées

- `vw_decision_engine_v1`
- `vw_allocation_engine_v1`
- `vw_order_plan_v1`
- `vw_order_execution_v1`
- `vw_order_execution_with_residual_v1`
- `vw_order_execution_final_v1`

## Action

Les vues legacy peuvent être supprimées dans l’ordre suivant :

```sql
drop view if exists public.vw_order_execution_final_v1;
drop view if exists public.vw_order_execution_with_residual_v1;
drop view if exists public.vw_order_execution_v1;
drop view if exists public.vw_order_plan_v1;
drop view if exists public.vw_allocation_engine_v1;
drop view if exists public.vw_decision_top3_v1;
drop view if exists public.vw_decision_engine_v1;

# Decision Engine Legacy Views Backup — 2026-05-01

## Contexte
Backup avant remplacement Decision Engine.

## Vues legacy
- vw_decision_engine_v1
- vw_allocation_engine_v1
- vw_order_plan_v1
- vw_order_execution_v1
- vw_order_execution_with_residual_v1
- vw_order_execution_final_v1

## Définitions SQL

| schemaname | viewname                            | definition                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| public     | vw_allocation_engine_v1             |  WITH decisions AS (
         SELECT vw_decision_engine_v1.ticker,
            vw_decision_engine_v1.asset_total_score,
            vw_decision_engine_v1.regime_label,
            vw_decision_engine_v1.regime_adjusted_score,
            vw_decision_engine_v1.opportunity_bucket,
            vw_decision_engine_v1.opportunity_rank,
            vw_decision_engine_v1.decision
           FROM vw_decision_engine_v1
          WHERE (vw_decision_engine_v1.decision = 'BUY'::text)
        ), top3 AS (
         SELECT decisions.ticker,
            decisions.asset_total_score,
            decisions.regime_label,
            decisions.regime_adjusted_score,
            decisions.opportunity_bucket,
            decisions.opportunity_rank,
            decisions.decision
           FROM decisions
          ORDER BY decisions.opportunity_rank
         LIMIT 3
        ), total_score AS (
         SELECT sum(top3.regime_adjusted_score) AS total_score
           FROM top3
        ), allocation AS (
         SELECT t.ticker,
            t.regime_adjusted_score,
            t.opportunity_rank,
            round((t.regime_adjusted_score / ts.total_score), 4) AS weight
           FROM (top3 t
             CROSS JOIN total_score ts)
        )
 SELECT ticker,
    regime_adjusted_score,
    opportunity_rank,
    weight
   FROM allocation
  ORDER BY opportunity_rank;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| public     | vw_decision_engine_v1               |  WITH ranked AS (
         SELECT vw_opportunity_ranking_v1.ticker,
            vw_opportunity_ranking_v1.quality_score,
            vw_opportunity_ranking_v1.growth_score,
            vw_opportunity_ranking_v1.momentum_score,
            vw_opportunity_ranking_v1.valuation_score,
            vw_opportunity_ranking_v1.asset_total_score,
            vw_opportunity_ranking_v1.regime_date,
            vw_opportunity_ranking_v1.regime_label,
            vw_opportunity_ranking_v1.regime_score,
            vw_opportunity_ranking_v1.trend_score,
            vw_opportunity_ranking_v1.regime_momentum_score,
            vw_opportunity_ranking_v1.breadth_score,
            vw_opportunity_ranking_v1.volatility_score,
            vw_opportunity_ranking_v1.macro_stress_score,
            vw_opportunity_ranking_v1.regime_adjusted_score,
            vw_opportunity_ranking_v1.opportunity_bucket,
            vw_opportunity_ranking_v1.opportunity_rank
           FROM vw_opportunity_ranking_v1
        ), decision AS (
         SELECT ranked.ticker,
            ranked.asset_total_score,
            ranked.regime_label,
            ranked.regime_adjusted_score,
            ranked.opportunity_bucket,
            ranked.opportunity_rank,
                CASE
                    WHEN (ranked.regime_adjusted_score < 6.5) THEN 'REJECT'::text
                    WHEN (ranked.regime_label = 'STRESS'::text) THEN 'WAIT'::text
                    WHEN ((ranked.regime_label = 'WEAK'::text) AND (ranked.regime_adjusted_score < (8)::numeric)) THEN 'WAIT'::text
                    WHEN (ranked.regime_adjusted_score >= (8)::numeric) THEN 'BUY'::text
                    WHEN (ranked.regime_adjusted_score >= (7)::numeric) THEN 'WAIT'::text
                    ELSE 'REJECT'::text
                END AS decision
           FROM ranked
        )
 SELECT ticker,
    asset_total_score,
    regime_label,
    regime_adjusted_score,
    opportunity_bucket,
    opportunity_rank,
    decision
   FROM decision
  ORDER BY opportunity_rank;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public     | vw_order_execution_final_v1         |  SELECT ticker,
    final_quantity AS quantity,
    entry_price AS limit_price,
    'BUY'::text AS side,
    'LIMIT'::text AS order_type,
    'GTC'::text AS time_in_force,
    round((final_quantity * entry_price), 2) AS order_value,
    data_age_minutes,
    final_invested_total,
    final_residual_cash,
    opportunity_rank
   FROM vw_order_execution_with_residual_v1
  WHERE (final_quantity > (0)::numeric)
  ORDER BY opportunity_rank;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| public     | vw_order_execution_v1               |  WITH orders AS (
         SELECT vw_order_plan_v1.ticker,
            vw_order_plan_v1.weight,
            vw_order_plan_v1.opportunity_rank,
            vw_order_plan_v1.total_capital,
            vw_order_plan_v1.allocation_amount
           FROM vw_order_plan_v1
        ), real_prices AS (
         SELECT vw_latest_real_prices_v1.ticker,
            vw_latest_real_prices_v1.last_price,
            vw_latest_real_prices_v1.updated_at
           FROM vw_latest_real_prices_v1
        ), execution AS (
         SELECT o.ticker,
            o.allocation_amount,
            o.opportunity_rank,
            p.last_price,
            p.updated_at,
            round((p.last_price * 0.995), 2) AS entry_price,
            floor((o.allocation_amount / round((p.last_price * 0.995), 2))) AS quantity,
            round((floor((o.allocation_amount / round((p.last_price * 0.995), 2))) * round((p.last_price * 0.995), 2)), 2) AS total_invested,
            round((EXTRACT(epoch FROM (now() - (p.updated_at AT TIME ZONE 'UTC'::text))) / 60.0), 2) AS data_age_minutes,
                CASE
                    WHEN (p.last_price IS NULL) THEN 'WAIT'::text
                    WHEN (p.updated_at IS NULL) THEN 'WAIT'::text
                    WHEN ((EXTRACT(epoch FROM (now() - (p.updated_at AT TIME ZONE 'UTC'::text))) / 60.0) > (15)::numeric) THEN 'WAIT'::text
                    ELSE 'BUY_LIMIT'::text
                END AS execution_action
           FROM (orders o
             JOIN real_prices p ON ((o.ticker = p.ticker)))
        )
 SELECT ticker,
    allocation_amount,
    opportunity_rank,
    last_price,
    updated_at,
    entry_price,
    quantity,
    total_invested,
    data_age_minutes,
    execution_action
   FROM execution
  ORDER BY opportunity_rank;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| public     | vw_order_execution_with_residual_v1 |  WITH base AS (
         SELECT vw_order_execution_v1.ticker,
            vw_order_execution_v1.allocation_amount,
            vw_order_execution_v1.opportunity_rank,
            vw_order_execution_v1.last_price,
            vw_order_execution_v1.updated_at,
            vw_order_execution_v1.entry_price,
            vw_order_execution_v1.quantity,
            vw_order_execution_v1.total_invested,
            vw_order_execution_v1.data_age_minutes,
            vw_order_execution_v1.execution_action
           FROM vw_order_execution_v1
        ), capital AS (
         SELECT max(vw_order_plan_v1.total_capital) AS total_capital
           FROM vw_order_plan_v1
        ), residual AS (
         SELECT c.total_capital,
            COALESCE(sum(
                CASE
                    WHEN (b.execution_action = 'BUY_LIMIT'::text) THEN b.total_invested
                    ELSE (0)::numeric
                END), (0)::numeric) AS invested_total,
            (c.total_capital - COALESCE(sum(
                CASE
                    WHEN (b.execution_action = 'BUY_LIMIT'::text) THEN b.total_invested
                    ELSE (0)::numeric
                END), (0)::numeric)) AS residual_cash
           FROM (capital c
             CROSS JOIN base b)
          GROUP BY c.total_capital
        ), ranked_extra AS (
         SELECT b.ticker,
            b.allocation_amount,
            b.opportunity_rank,
            b.last_price,
            b.updated_at,
            b.entry_price,
            b.quantity,
            b.total_invested,
            b.data_age_minutes,
            b.execution_action,
            r.total_capital,
            r.residual_cash,
                CASE
                    WHEN ((b.execution_action = 'BUY_LIMIT'::text) AND (r.residual_cash >= b.entry_price)) THEN 1
                    ELSE 0
                END AS extra_unit_candidate,
            sum(
                CASE
                    WHEN ((b.execution_action = 'BUY_LIMIT'::text) AND (r.residual_cash >= b.entry_price)) THEN b.entry_price
                    ELSE (0)::numeric
                END) OVER (ORDER BY b.opportunity_rank) AS cumulative_extra_cost
           FROM (base b
             CROSS JOIN residual r)
        ), finalized AS (
         SELECT ranked_extra.ticker,
            ranked_extra.allocation_amount,
            ranked_extra.opportunity_rank,
            ranked_extra.last_price,
            ranked_extra.updated_at,
            ranked_extra.entry_price,
            ranked_extra.quantity,
            ranked_extra.data_age_minutes,
                CASE
                    WHEN ((ranked_extra.extra_unit_candidate = 1) AND (ranked_extra.cumulative_extra_cost <= ranked_extra.residual_cash)) THEN 1
                    ELSE 0
                END AS extra_quantity,
            ranked_extra.total_capital,
            ranked_extra.residual_cash,
            ranked_extra.execution_action
           FROM ranked_extra
        )
 SELECT ticker,
    allocation_amount,
    opportunity_rank,
    last_price,
    updated_at,
    entry_price,
    quantity,
    extra_quantity,
    (quantity + (extra_quantity)::numeric) AS final_quantity,
    round(((quantity + (extra_quantity)::numeric) * entry_price), 2) AS final_total_invested,
    sum(((quantity + (extra_quantity)::numeric) * entry_price)) OVER () AS final_invested_total,
    data_age_minutes,
    execution_action,
    total_capital,
    round((total_capital - sum(((quantity + (extra_quantity)::numeric) * entry_price)) OVER ()), 2) AS final_residual_cash
   FROM finalized
  WHERE (execution_action = 'BUY_LIMIT'::text)
  ORDER BY opportunity_rank; |
| public     | vw_order_plan_v1                    |  WITH allocation AS (
         SELECT vw_allocation_engine_v1.ticker,
            vw_allocation_engine_v1.regime_adjusted_score,
            vw_allocation_engine_v1.opportunity_rank,
            vw_allocation_engine_v1.weight
           FROM vw_allocation_engine_v1
        ), capital AS (
         SELECT (10000)::numeric AS total_capital
        ), orders AS (
         SELECT a.ticker,
            a.weight,
            a.opportunity_rank,
            c.total_capital,
            round((a.weight * c.total_capital), 2) AS allocation_amount
           FROM (allocation a
             CROSS JOIN capital c)
        )
 SELECT ticker,
    weight,
    opportunity_rank,
    total_capital,
    allocation_amount
   FROM orders
  ORDER BY opportunity_rank;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |