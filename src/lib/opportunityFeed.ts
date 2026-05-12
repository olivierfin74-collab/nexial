import { getFlashDropPriority, type FlashDropPriority } from "@/lib/flashDropPriority";

export type OpportunityFeedAction = "WATCH" | "PREPARE_LADDER" | "WAIT";

export type OpportunityFeedInput = {
  id: string;
  ticker: string;
  name?: string | null;
  price?: number | null;
  intraday_change_pct?: number | null;
  close_to_close_pct?: number | null;
  price_vs_vwap_pct?: number | null;
  signal_strength?: string | null;
  trigger_reason?: string | null;
  in_watchlist?: boolean;
  in_portfolio?: boolean;
  is_tier1_watchlist?: boolean;
  ladder?: {
    z1_price: number;
    z2_price: number;
    z3_price: number;
    z1_weight: number;
    z2_weight: number;
    z3_weight: number;
  } | null;
  regime?: string | null;
};

export type OpportunityFeedItem = {
  id: string;
  ticker: string;
  name: string | null;
  opportunity_type: "FLASH_DROP";
  reason: string;
  priority: FlashDropPriority;
  regime: string;
  latest_price: number | null;
  drop_pct: number | null;
  ladder: OpportunityFeedInput["ladder"];
  suggested_action: OpportunityFeedAction;
  rank_score: number;
};

const priorityScore: Record<FlashDropPriority, number> = {
  LOW: 10,
  MEDIUM: 30,
  HIGH: 60,
  CRITICAL: 90,
};

const regimePenalty: Record<string, number> = {
  BULL: 10,
  NEUTRAL: 0,
  WEAK: -10,
  STRESS: -25,
};

function primaryDrop(input: OpportunityFeedInput) {
  const values = [
    input.intraday_change_pct,
    input.close_to_close_pct,
    input.price_vs_vwap_pct,
  ].filter((value): value is number => typeof value === "number" && Number.isFinite(value));

  return values.length ? Math.min(...values) : null;
}

function suggestedAction(priority: FlashDropPriority, hasLadder: boolean, regime: string): OpportunityFeedAction {
  if (regime === "STRESS") return "WAIT";
  if (hasLadder && (priority === "HIGH" || priority === "CRITICAL")) return "PREPARE_LADDER";
  if (priority === "LOW") return "WAIT";
  return "WATCH";
}

export function buildOpportunityFeedItem(input: OpportunityFeedInput): OpportunityFeedItem {
  const priority = getFlashDropPriority({
    signal_strength: input.signal_strength,
    in_watchlist: input.in_watchlist,
    in_portfolio: input.in_portfolio,
    is_tier1_watchlist: input.is_tier1_watchlist,
    opportunity_score: input.signal_strength === "EXTREME" ? 90 : input.signal_strength === "HIGH" ? 75 : 60,
  });
  const regime = input.regime || "NEUTRAL";
  const drop = primaryDrop(input);
  const hasLadder = Boolean(input.ladder);
  const rank_score = Math.round(
    priorityScore[priority] +
    (hasLadder ? 15 : 0) +
    (drop == null ? 0 : Math.min(Math.abs(drop), 15)) +
    (regimePenalty[regime] ?? 0),
  );

  return {
    id: input.id,
    ticker: input.ticker,
    name: input.name || null,
    opportunity_type: "FLASH_DROP",
    reason: input.trigger_reason || "Flash drop detected",
    priority,
    regime,
    latest_price: typeof input.price === "number" ? input.price : null,
    drop_pct: drop,
    ladder: input.ladder || null,
    suggested_action: suggestedAction(priority, hasLadder, regime),
    rank_score,
  };
}

export function rankOpportunityFeed(items: OpportunityFeedItem[]) {
  const byTicker = new Map<string, OpportunityFeedItem>();
  for (const item of items) {
    const key = item.ticker.toUpperCase();
    const previous = byTicker.get(key);
    if (!previous || item.rank_score > previous.rank_score) byTicker.set(key, item);
  }

  return Array.from(byTicker.values()).sort((a, b) => (
    b.rank_score - a.rank_score ||
    a.ticker.localeCompare(b.ticker)
  ));
}
