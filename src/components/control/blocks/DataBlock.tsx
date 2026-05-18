import { Block } from '../Block'
import { KvRow } from '../KvRow'
import type { DataFreshnessAlert, MarketFreshness } from '@/lib/control/types'
import type { ControlStatus } from '@/lib/control/types'
import { formatInt, normalizeStatus } from '@/lib/control/wording'

interface DataBlockProps {
  freshness: DataFreshnessAlert[]
  market: MarketFreshness[]
  criticalStaleAssets: number | null | undefined
  warnStaleAssets: number | null | undefined
}

function summarize(rows: DataFreshnessAlert[]): ControlStatus {
  if (!rows.length) return 'NEUTRAL'
  let worst: ControlStatus = 'HEALTHY'
  const rank: Record<ControlStatus, number> = { HEALTHY: 0, BOOTSTRAPPING: 1, NEUTRAL: 1, DEGRADED: 2, CRITICAL: 3 }
  for (const r of rows) {
    const s = normalizeStatus(r.freshness_status)
    if (rank[s] > rank[worst]) worst = s
  }
  return worst
}

export function DataBlock({ freshness, market, criticalStaleAssets, warnStaleAssets }: DataBlockProps) {
  const status = summarize(freshness)
  return (
    <Block letter="B" title="Données" status={status}>
      <div>
        <KvRow first label="Actifs avec données fraîches" value={formatInt(freshness.length === 0 ? 0 : freshness.length - (criticalStaleAssets ?? 0) - (warnStaleAssets ?? 0))} hint={`${formatInt(freshness.length)} surveillés`} />
        <KvRow label="À surveiller" value={formatInt(warnStaleAssets ?? 0)} hint="Données légèrement en retard" />
        <KvRow label="Action requise" value={formatInt(criticalStaleAssets ?? 0)} hint="Données silencieuses trop longtemps" />
        {market.map((m, i) => (
          <KvRow
            key={m.region}
            label={`Marché ${m.region}`}
            value={m.ui_freshness_label ?? '—'}
            hint={m.market_status ? labelForMarketStatus(m.market_status) : undefined}
            first={false && i === 0}
          />
        ))}
      </div>
    </Block>
  )
}

function labelForMarketStatus(s: string): string {
  if (s === 'OPEN') return 'Ouvert'
  if (s === 'CLOSED') return 'Fermé'
  if (s === 'PRE_MARKET') return 'Pré-marché'
  if (s === 'AFTER_HOURS') return 'After-hours'
  return s
}
