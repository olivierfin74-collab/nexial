export type FlashDropCandidate = {
  asset_id?: string | null;
  ticker: string;
  price?: number | null;
  intraday_change_pct?: number | null;
  close_to_close_pct?: number | null;
  price_vs_vwap_pct?: number | null;
  market_cap?: number | null;
  volume?: number | null;
  asset_active?: boolean | null;
  source?: string | null;
  detected_at?: string | null;
};

export type FlashDropConfig = {
  minMarketCap: number;
  minVolume: number;
};

export type FlashDropEventInput = Required<Pick<FlashDropCandidate, "ticker">> & {
  asset_id: string | null;
  detected_at: string;
  detection_bucket: string;
  price: number | null;
  intraday_change_pct: number | null;
  close_to_close_pct: number | null;
  price_vs_vwap_pct: number | null;
  market_cap: number | null;
  volume: number | null;
  signal_strength: "MEDIUM" | "HIGH" | "EXTREME";
  source: string;
  trigger_reason: string;
};

export const DEFAULT_FLASH_DROP_CONFIG: FlashDropConfig = {
  minMarketCap: 1_000_000_000,
  minVolume: 100_000,
};

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === "number" && Number.isFinite(value)
);

function normalizePct(value: unknown): number | null {
  return isFiniteNumber(value) ? value : null;
}

function getMostNegative(values: Array<number | null>) {
  const available = values.filter(isFiniteNumber);
  return available.length > 0 ? Math.min(...available) : null;
}

function classifySignalStrength(worstPct: number): "MEDIUM" | "HIGH" | "EXTREME" {
  if (worstPct <= -8) return "EXTREME";
  if (worstPct <= -5) return "HIGH";
  return "MEDIUM";
}

function getTriggerReason(candidate: FlashDropCandidate) {
  const reasons: string[] = [];
  if ((candidate.intraday_change_pct ?? 0) <= -3) reasons.push("intraday_change_pct <= -3%");
  if ((candidate.close_to_close_pct ?? 0) <= -4) reasons.push("close_to_close_pct <= -4%");
  if ((candidate.price_vs_vwap_pct ?? 0) <= -2) reasons.push("price_vs_vwap_pct <= -2%");
  return reasons.join(" OR ");
}

function bucketToFiveMinutes(date: Date) {
  const copy = new Date(date);
  const minutes = copy.getUTCMinutes();
  copy.setUTCMinutes(minutes - (minutes % 5), 0, 0);
  return copy.toISOString();
}

export function detectFlashDrop(
  candidate: FlashDropCandidate,
  config: FlashDropConfig = DEFAULT_FLASH_DROP_CONFIG,
): FlashDropEventInput | null {
  const ticker = candidate.ticker?.trim().toUpperCase();
  if (!ticker) return null;
  if (candidate.asset_active === false) return null;
  if (!isFiniteNumber(candidate.market_cap) || candidate.market_cap <= config.minMarketCap) return null;
  if (!isFiniteNumber(candidate.volume) || candidate.volume <= config.minVolume) return null;

  const intraday = normalizePct(candidate.intraday_change_pct);
  const closeToClose = normalizePct(candidate.close_to_close_pct);
  const priceVsVwap = normalizePct(candidate.price_vs_vwap_pct);
  const isTriggered = (intraday ?? 0) <= -3 || (closeToClose ?? 0) <= -4 || (priceVsVwap ?? 0) <= -2;
  if (!isTriggered) return null;

  const worstPct = getMostNegative([intraday, closeToClose, priceVsVwap]);
  if (worstPct === null) return null;

  const detectedAt = candidate.detected_at ? new Date(candidate.detected_at) : new Date();
  const safeDetectedAt = Number.isNaN(detectedAt.getTime()) ? new Date() : detectedAt;

  return {
    asset_id: candidate.asset_id ?? null,
    ticker,
    detected_at: safeDetectedAt.toISOString(),
    detection_bucket: bucketToFiveMinutes(safeDetectedAt),
    price: isFiniteNumber(candidate.price) ? candidate.price : null,
    intraday_change_pct: intraday,
    close_to_close_pct: closeToClose,
    price_vs_vwap_pct: priceVsVwap,
    market_cap: candidate.market_cap,
    volume: candidate.volume,
    signal_strength: classifySignalStrength(worstPct),
    source: candidate.source || "api",
    trigger_reason: getTriggerReason({ ...candidate, intraday_change_pct: intraday, close_to_close_pct: closeToClose, price_vs_vwap_pct: priceVsVwap }),
  };
}

export function detectFlashDrops(
  candidates: FlashDropCandidate[],
  config: FlashDropConfig = DEFAULT_FLASH_DROP_CONFIG,
) {
  const events = candidates
    .map((candidate) => detectFlashDrop(candidate, config))
    .filter((event): event is FlashDropEventInput => event !== null);

  return Array.from(
    new Map(events.map((event) => [`${event.ticker}:${event.source}:${event.detection_bucket}`, event])).values(),
  );
}
