export type AccountPreference = "AUTO" | "PEA" | "CTO";
export type InvestDecision = "INVEST" | "PARTIAL" | "WAIT";

export type InvestTargetRow = {
  asset_id: string;
  ticker: string;
  asset_name: string;
  account_id: string;
  account_name: string;
  account_type: string;
  broker_code: string;
  preferred_account_type: string;
  market_value: number | string | null;
  portfolio_weight_pct: number | string | null;
  target_weight_pct: number | string | null;
  max_weight_pct: number | string | null;
  total_score_v2: number | string | null;
  capital_efficiency_score: number | string | null;
  expected_return_pct: number | string | null;
  opportunity_cost_gap: number | string | null;
  decision_v4: string | null;
  current_price: number | string | null;
  funding_need_amount: number | string | null;
  buy_zone: string | null;
  target_rank: number | string | null;
};

export type CashRow = {
  id?: string;
  snapshot_at?: string;
  account_id: string;
  account_name: string;
  account_type: string;
  broker_code: string;
  currency: string;
  cash_amount: number | string | null;
  created_at?: string;
};

export type InvestProposal = {
  ticker: string;
  assetName: string;
  accountName: string;
  accountType: string;
  currentPrice: number;
  suggestedAmount: number;
  suggestedQuantity: number;
  targetRank: number;
  totalScore: number;
  capitalEfficiencyScore: number;
  expectedReturnPct: number;
  buyZone: string;
  decision: string;
  isExecutable: boolean;
  reason: string;
};

export type InvestPlan = {
  state: InvestDecision;
  availableCash: number;
  requestedAmount: number;
  deployableAmount: number;
  investNowAmount: number;
  keepCashAmount: number;
  summary: string;
  proposals: InvestProposal[];
  executable: InvestProposal[];
  watchOnly: InvestProposal[];
};