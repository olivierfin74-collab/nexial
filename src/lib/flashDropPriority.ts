export type FlashDropPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FlashDropPriorityInput = {
  signal_strength?: string | null;
  in_watchlist?: boolean | null;
  in_portfolio?: boolean | null;
  is_tier1_watchlist?: boolean | null;
  opportunity_score?: number | null;
};

const score = (value: unknown) => (
  typeof value === "number" && Number.isFinite(value) ? value : 0
);

export function getFlashDropPriority(input: FlashDropPriorityInput): FlashDropPriority {
  const signal = (input.signal_strength || "").toUpperCase();
  const opportunityScore = score(input.opportunity_score);

  if (input.is_tier1_watchlist && opportunityScore >= 75) return "CRITICAL";
  if (signal === "EXTREME" && (input.in_watchlist || input.in_portfolio)) return "CRITICAL";
  if (input.in_watchlist || input.in_portfolio) return "HIGH";
  if (signal === "HIGH" || signal === "EXTREME") return "HIGH";
  return "MEDIUM";
}
