export type MarketRegime = "BULL" | "NEUTRAL" | "WEAK" | "STRESS";

export type MarketRegimeInput = {
  qqq_trend_pct?: number | null;
  sp500_trend_pct?: number | null;
  vix_level?: number | null;
  breadth_pct?: number | null;
  usd_trend_pct?: number | null;
  rates_trend_pct?: number | null;
  source?: string | null;
  detected_at?: string | null;
};

export type MarketRegimeResult = {
  detected_at: string;
  detected_date: string;
  regime: MarketRegime;
  score: number;
  index_score: number;
  volatility_score: number;
  breadth_score: number;
  macro_score: number;
  source: string;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const isNum = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const round = (value: number) => Math.round(value * 10) / 10;

function trendScore(value: number | null | undefined) {
  if (!isNum(value)) return 17.5;
  if (value >= 2) return 35;
  if (value >= 0) return 27;
  if (value >= -3) return 17;
  return 7;
}

function volatilityScore(vix: number | null | undefined) {
  if (!isNum(vix)) return 12.5;
  if (vix < 16) return 25;
  if (vix < 22) return 19;
  if (vix < 30) return 10;
  return 2;
}

function breadthScore(breadthPct: number | null | undefined) {
  if (!isNum(breadthPct)) return 10;
  if (breadthPct >= 60) return 20;
  if (breadthPct >= 45) return 14;
  if (breadthPct >= 30) return 8;
  return 2;
}

function macroPressureScore(usdTrend: number | null | undefined, ratesTrend: number | null | undefined) {
  let score = 20;
  if (!isNum(usdTrend) && !isNum(ratesTrend)) return 10;
  if (isNum(usdTrend)) score -= clamp(usdTrend, -2, 4) * 2;
  if (isNum(ratesTrend)) score -= clamp(ratesTrend, -2, 4) * 2;
  return clamp(score, 0, 20);
}

function regimeFromScore(score: number): MarketRegime {
  if (score >= 75) return "BULL";
  if (score >= 55) return "NEUTRAL";
  if (score >= 35) return "WEAK";
  return "STRESS";
}

export function calculateMarketRegime(input: MarketRegimeInput): MarketRegimeResult {
  const qqqScore = trendScore(input.qqq_trend_pct);
  const spScore = trendScore(input.sp500_trend_pct);
  const index_score = round((qqqScore + spScore) / 2);
  const volatility_score = round(volatilityScore(input.vix_level));
  const breadth_score = round(breadthScore(input.breadth_pct));
  const macro_score = round(macroPressureScore(input.usd_trend_pct, input.rates_trend_pct));
  const score = round(index_score + volatility_score + breadth_score + macro_score);
  const detectedAt = input.detected_at ? new Date(input.detected_at) : new Date();

  return {
    detected_at: Number.isNaN(detectedAt.getTime()) ? new Date().toISOString() : detectedAt.toISOString(),
    detected_date: (Number.isNaN(detectedAt.getTime()) ? new Date() : detectedAt).toISOString().slice(0, 10),
    regime: regimeFromScore(score),
    score,
    index_score,
    volatility_score,
    breadth_score,
    macro_score,
    source: input.source || "api",
  };
}
