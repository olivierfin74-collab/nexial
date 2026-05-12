export type LadderSourceEvent = {
  id: string;
  asset_id?: string | null;
  ticker: string;
  price: number;
  atr?: number | null;
};

export type LadderPlanInput = {
  flash_drop_event_id: string;
  asset_id: string | null;
  ticker: string;
  z1_price: number;
  z2_price: number;
  z3_price: number;
  z1_weight: 0.4;
  z2_weight: 0.35;
  z3_weight: 0.25;
  atr_used: number | null;
  status: "PROPOSED";
};

const roundPrice = (value: number) => Math.round(value * 100) / 100;

export function buildLadderPlan(event: LadderSourceEvent): LadderPlanInput | null {
  if (!event.id || !event.ticker || !Number.isFinite(event.price) || event.price <= 0) {
    return null;
  }

  const atr = typeof event.atr === "number" && Number.isFinite(event.atr) && event.atr > 0
    ? event.atr
    : null;
  const z1 = event.price;
  const z2 = atr ? event.price - atr : event.price * 0.95;
  const z3 = atr ? event.price - (2 * atr) : event.price * 0.90;

  return {
    flash_drop_event_id: event.id,
    asset_id: event.asset_id ?? null,
    ticker: event.ticker.trim().toUpperCase(),
    z1_price: roundPrice(z1),
    z2_price: roundPrice(Math.max(z2, 0.01)),
    z3_price: roundPrice(Math.max(z3, 0.01)),
    z1_weight: 0.4,
    z2_weight: 0.35,
    z3_weight: 0.25,
    atr_used: atr,
    status: "PROPOSED",
  };
}

export function buildLadderPlans(events: LadderSourceEvent[]) {
  return events
    .map(buildLadderPlan)
    .filter((plan): plan is LadderPlanInput => plan !== null);
}
