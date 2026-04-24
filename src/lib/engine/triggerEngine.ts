export type Trigger = {
  type: string
  asset: string
  ticker: string
  value: number
  strength?: string
}

export function detectTriggers(allocation: any[]): Trigger[] {
  const triggers: Trigger[] = []

  for (const a of allocation) {
    const momentum = a.unrealized_pnl_pct ?? 0
    const weight = a.weight ?? 0
    const score = a.score ?? 0

    if (momentum <= -8) {
      triggers.push({
        type: 'PULLBACK',
        asset: a.asset_name,
        ticker: a.ticker ?? '-',
        value: momentum,
        strength: 'MEDIUM',
      })
    }

    if (momentum <= -5) {
      triggers.push({
        type: 'FAST_DROP',
        asset: a.asset_name,
        ticker: a.ticker ?? '-',
        value: momentum,
        strength: 'HIGH',
      })
    }

    if (momentum >= 10) {
      triggers.push({
        type: 'OVEREXTENDED',
        asset: a.asset_name,
        ticker: a.ticker ?? '-',
        value: momentum,
        strength: 'MEDIUM',
      })
    }

    if (weight >= 25) {
      triggers.push({
        type: 'OVERWEIGHT',
        asset: a.asset_name,
        ticker: a.ticker ?? '-',
        value: weight,
      })
    }

    if (weight <= 5 && momentum > 0) {
      triggers.push({
        type: 'UNDERWEIGHT_OPPORTUNITY',
        asset: a.asset_name,
        ticker: a.ticker ?? '-',
        value: weight,
      })
    }

    if (score <= 5) {
      triggers.push({
        type: 'WEAK_ASSET',
        asset: a.asset_name,
        ticker: a.ticker ?? '-',
        value: score,
      })
    }
  }

  return triggers
}