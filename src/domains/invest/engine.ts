import type {
  AccountPreference,
  InvestPlan,
  InvestProposal,
  InvestTargetRow,
  CashRow,
  InvestDecision,
} from "./types";

function toNumber(value: number | string | null | undefined): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function normalizeAccountPreference(
  value?: string
): AccountPreference {
  if (value === "PEA" || value === "CTO") return value;
  return "AUTO";
}

function isExecutableTarget(row: InvestTargetRow): boolean {
  const buyZone = row.buy_zone ?? "NONE";
  const decision = row.decision_v4 ?? "HOLD";

  return (
    buyZone !== "NONE" &&
    ["BUY", "ACCUMULATE", "ADD"].includes(decision)
  );
}

function buildReason(
  row: InvestTargetRow,
  executable: boolean
): string {
  const score = toNumber(row.total_score_v2);
  const efficiency = toNumber(row.capital_efficiency_score);
  const expectedReturn = toNumber(row.expected_return_pct);
  const buyZone = row.buy_zone ?? "NONE";

  if (executable) {
    return `Score ${score.toFixed(2)}, efficacité ${efficiency.toFixed(
      2
    )}, rendement attendu ${expectedReturn.toFixed(
      0
    )} %. Zone d’achat valide.`;
  }

  if (buyZone === "NONE") {
    return `Bonne idée sous surveillance, mais hors zone d’achat. Score ${score.toFixed(
      2
    )}, rendement attendu ${expectedReturn.toFixed(0)} %.`;
  }

  return `Idée intéressante mais non exécutable immédiatement. Score ${score.toFixed(
    2
  )}, efficacité ${efficiency.toFixed(2)}.`;
}

function buildProposal(
  row: InvestTargetRow,
  deployableAmount: number
): InvestProposal {
  const currentPrice = toNumber(row.current_price);
  const fundingNeed = toNumber(row.funding_need_amount);
  const totalScore = toNumber(row.total_score_v2);
  const capitalEfficiencyScore = toNumber(row.capital_efficiency_score);
  const expectedReturnPct = toNumber(row.expected_return_pct);
  const targetRank = toNumber(row.target_rank);
  const buyZone = row.buy_zone ?? "NONE";
  const decision = row.decision_v4 ?? "HOLD";
  const executable = isExecutableTarget(row);

  const suggestedAmount = Math.max(
    0,
    Math.min(deployableAmount, fundingNeed > 0 ? fundingNeed : deployableAmount)
  );

  const suggestedQuantity =
    currentPrice > 0 ? Math.floor(suggestedAmount / currentPrice) : 0;

  return {
    ticker: row.ticker,
    assetName: row.asset_name,
    accountName: row.account_name,
    accountType: row.account_type,
    currentPrice,
    suggestedAmount,
    suggestedQuantity,
    targetRank,
    totalScore,
    capitalEfficiencyScore,
    expectedReturnPct,
    buyZone,
    decision,
    isExecutable: executable,
    reason: buildReason(row, executable),
  };
}

function computeDecision(executableCount: number): InvestDecision {
  if (executableCount >= 2) return "INVEST";
  if (executableCount === 1) return "PARTIAL";
  return "WAIT";
}

function buildSummary(
  state: InvestDecision,
  watchOnly: InvestProposal[]
): string {
  if (state === "INVEST") {
    return "Des opportunités sont en zone. Déploiement immédiat recommandé sur les meilleures idées.";
  }

  if (state === "PARTIAL") {
    return "Une opportunité seulement est exécutable. Déploiement partiel recommandé, avec conservation du reste en cash.";
  }

  if (watchOnly.length > 0) {
    return `Aucune idée n’est en zone d’achat. Meilleure idée à surveiller : ${watchOnly[0].ticker}. Discipline prioritaire : attendre un meilleur point d’entrée.`;
  }

  return "Aucune action forte maintenant. Le moteur recommande d’attendre.";
}

export function buildInvestPlan(args: {
  targets: InvestTargetRow[];
  cashRows: CashRow[];
  requestedAmount: number;
  accountPreference: AccountPreference;
}): InvestPlan {
  const { targets, cashRows, requestedAmount, accountPreference } = args;

  const normalizedCash = cashRows.map((row) => ({
    ...row,
    cash_amount: toNumber(row.cash_amount),
  }));

  const filteredCash =
    accountPreference === "AUTO"
      ? normalizedCash
      : normalizedCash.filter((row) => row.account_type === accountPreference);

  const availableCash = filteredCash.reduce(
    (sum, row) => sum + row.cash_amount,
    0
  );

  const deployableAmount = Math.max(
    0,
    Math.min(requestedAmount, availableCash)
  );

  const filteredTargets =
    accountPreference === "AUTO"
      ? targets
      : targets.filter((row) => row.account_type === accountPreference);

  const rankedTargets = [...filteredTargets].sort(
    (a, b) => toNumber(a.target_rank) - toNumber(b.target_rank)
  );

  const proposals = rankedTargets
    .slice(0, 3)
    .map((row) => buildProposal(row, deployableAmount));

  const executable = proposals.filter((proposal) => proposal.isExecutable);
  const watchOnly = proposals.filter((proposal) => !proposal.isExecutable);

  const state = computeDecision(executable.length);

  const investNowAmount =
    state === "WAIT"
      ? 0
      : Math.min(
          deployableAmount,
          executable.reduce((sum, proposal) => sum + proposal.suggestedAmount, 0)
        );

  const keepCashAmount = Math.max(0, availableCash - investNowAmount);

  return {
    state,
    availableCash,
    requestedAmount,
    deployableAmount,
    investNowAmount,
    keepCashAmount,
    summary: buildSummary(state, watchOnly),
    proposals,
    executable,
    watchOnly,
  };
}