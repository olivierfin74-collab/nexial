export type DecisionEngineRow = {
  position_id: string;
  asset_id: string;
  asset_name: string | null;
  ticker: string | null;
  account_name: string | null;
  account_type: string | null;
  broker_code: string | null;
  market_value: number | null;
  portfolio_weight_pct: number | null;
  total_score_v2: number | null;
  capital_efficiency_score: number | null;
  opportunity_cost_gap: number | null;
  expected_return_pct: number | null;
  buy_zone: string | null;
  momentum_regime: string | null;
  decision_v2: string | null;
};

export type OpportunityRow = {
  rank_global: number;
  asset_id: string;
  asset_name: string | null;
  ticker: string | null;
  decision_v2: string | null;
  total_score_v2: number | null;
  capital_efficiency_score: number | null;
  expected_return_pct: number | null;
  buy_zone: string | null;
  preferred_account_type: string | null;
};

export type InvestNowPlanRow = {
  rank_global: number;
  ticker: string | null;
  asset_name: string | null;
  decision_v2: string | null;
  preferred_account_type: string | null;
  account_id: string;
  account_name: string | null;
  account_type: string | null;
  cash_amount: number | null;
  allocation_share: number | null;
  recommended_amount: number | null;
  current_price: number | null;
  recommended_quantity: number | null;
  buy_zone: string | null;
  total_score_v2: number | null;
  capital_efficiency_score: number | null;
  expected_return_pct: number | null;
};