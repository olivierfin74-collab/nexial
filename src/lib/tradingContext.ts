export type TradingContextMode = "PEA" | "CTO";

export type TradingContext = {
  mode: TradingContextMode;
  label: string;
  focus: string;
  opportunityFocus: string;
  watchlistFocus: string;
};

const PARIS_TIME_ZONE = "Europe/Paris";

export function parisHour(now = new Date()) {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIME_ZONE,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  return Number.isFinite(hour) ? hour : 0;
}

export function normalizeTradingContext(value: unknown): TradingContextMode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  if (normalized === "PEA") return "PEA";
  if (normalized === "CTO") return "CTO";
  return null;
}

export function getTradingContext(now = new Date(), override?: unknown): TradingContext {
  const mode = normalizeTradingContext(override) || (parisHour(now) < 14 ? "PEA" : "CTO");
  return mode === "PEA"
    ? {
        mode,
        label: "Matin PEA",
        focus: "Focus PEA jusqu'a 14:00 Europe/Paris",
        opportunityFocus: "Europe / Euronext",
        watchlistFocus: "Watchlist PEA prioritaire",
      }
    : {
        mode,
        label: "Apres-midi CTO",
        focus: "Focus CTO apres 14:00 Europe/Paris",
        opportunityFocus: "US / Nasdaq",
        watchlistFocus: "Watchlist CTO prioritaire",
      };
}

const text = (value: unknown) => (typeof value === "string" ? value.toUpperCase() : "");

export function matchesTradingContext(row: Record<string, unknown>, mode: TradingContextMode) {
  const exchangeRegion = text(row.exchange_region);
  const exchangeMic = text(row.exchange_mic);
  const currency = text(row.currency || row.asset_currency);
  const account = text(row.current_account || row.account_name || row.account_kind || row.account_universe || row.universe);
  const ticker = text(row.ticker);

  if (mode === "PEA") {
    return row.pea_eligible === true ||
      account.includes("PEA") ||
      exchangeRegion.includes("EUROPE") ||
      exchangeRegion.includes("EURONEXT") ||
      ["XPAR", "XAMS", "XBRU", "XLIS", "XETR", "XMIL"].includes(exchangeMic) ||
      [".PA", ".AS", ".BR", ".LS", ".DE", ".MI"].some((suffix) => ticker.endsWith(suffix)) ||
      (currency === "EUR" && !ticker.includes(".US"));
  }

  return row.cto_eligible === true ||
    account.includes("CTO") ||
    exchangeRegion.includes("US") ||
    exchangeRegion.includes("NASDAQ") ||
    exchangeRegion.includes("NYSE") ||
    ["XNAS", "XNYS", "ARCX", "BATS"].includes(exchangeMic) ||
    ticker.endsWith(".US") ||
    (!ticker.includes(".") && currency !== "EUR") ||
    currency === "USD";
}

export function rankForTradingContext<T extends Record<string, unknown>>(rows: T[], mode: TradingContextMode) {
  return [...rows].sort((a, b) => {
    const aMatch = matchesTradingContext(a, mode) ? 1 : 0;
    const bMatch = matchesTradingContext(b, mode) ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return Number(b.rank_score ?? b.combined_score ?? b.opportunity_score ?? 0) -
      Number(a.rank_score ?? a.combined_score ?? a.opportunity_score ?? 0);
  });
}
