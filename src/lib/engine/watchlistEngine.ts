export type WatchlistItem = {
  id: string
  asset_name: string
  ticker: string
  account_scope: 'AUTO' | 'PEA' | 'CTO'
  thesis?: string | null
  z1_price?: number | null
  z2_price?: number | null
  z3_price?: number | null
  target_weight?: number | null
  priority_score?: number | null
  note?: string | null
}

export type MarketRow = {
  asset_name: string
  ticker: string | null
  current_price?: number | null
  score?: number | null
  account_name?: string | null
  account_type?: string | null
}

export type WatchlistViewRow = {
  id: string
  asset_name: string
  ticker: string
  account_scope: string
  current_price: number | null
  z1_price: number | null
  z2_price: number | null
  z3_price: number | null
  dist_z1_pct: number | null
  dist_z2_pct: number | null
  dist_z3_pct: number | null
  score: number | null
  priority_score: number | null
  status: 'EN ZONE' | 'PROCHE Z1' | 'PROCHE Z2' | 'PROCHE Z3' | 'LOIN' | 'SANS PRIX'
  thesis: string | null
  note: string | null
}

export function buildWatchlistView(
  watchlist: WatchlistItem[],
  marketRows: MarketRow[]
): WatchlistViewRow[] {
  return watchlist.map((item) => {
    const match = marketRows.find(
      (m) =>
        (m.ticker && m.ticker === item.ticker) ||
        m.asset_name === item.asset_name
    )

    const currentPrice = match?.current_price ?? null
    const score = match?.score ?? null

    const distZ1 = pctDistance(currentPrice, item.z1_price ?? null)
    const distZ2 = pctDistance(currentPrice, item.z2_price ?? null)
    const distZ3 = pctDistance(currentPrice, item.z3_price ?? null)

    return {
      id: item.id,
      asset_name: item.asset_name,
      ticker: item.ticker,
      account_scope: item.account_scope,
      current_price: currentPrice,
      z1_price: item.z1_price ?? null,
      z2_price: item.z2_price ?? null,
      z3_price: item.z3_price ?? null,
      dist_z1_pct: distZ1,
      dist_z2_pct: distZ2,
      dist_z3_pct: distZ3,
      score,
      priority_score: item.priority_score ?? null,
      status: buildStatus(currentPrice, item.z1_price ?? null, item.z2_price ?? null, item.z3_price ?? null),
      thesis: item.thesis ?? null,
      note: item.note ?? null,
    }
  })
}

function pctDistance(current: number | null, zone: number | null) {
  if (current == null || zone == null || zone === 0) return null
  return ((current / zone) - 1) * 100
}

function buildStatus(
  current: number | null,
  z1: number | null,
  z2: number | null,
  z3: number | null
): WatchlistViewRow['status'] {
  if (current == null) return 'SANS PRIX'

  const d1 = absPctDistance(current, z1)
  const d2 = absPctDistance(current, z2)
  const d3 = absPctDistance(current, z3)

  if (
    (z1 != null && current <= z1) ||
    (z2 != null && current <= z2) ||
    (z3 != null && current <= z3)
  ) {
    return 'EN ZONE'
  }

  if (d1 != null && d1 <= 3) return 'PROCHE Z1'
  if (d2 != null && d2 <= 3) return 'PROCHE Z2'
  if (d3 != null && d3 <= 3) return 'PROCHE Z3'

  return 'LOIN'
}

function absPctDistance(current: number | null, zone: number | null) {
  if (current == null || zone == null || zone === 0) return null
  return Math.abs(((current / zone) - 1) * 100)
}