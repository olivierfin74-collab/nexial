import { Block } from '../Block'
import { KvRow } from '../KvRow'
import type { AlertQualityKpis } from '@/lib/control/types'
import { formatInt, formatPct, normalizeStatus } from '@/lib/control/wording'

interface AlertQualityBlockProps {
  data: AlertQualityKpis | null
}

export function AlertQualityBlock({ data }: AlertQualityBlockProps) {
  const status = normalizeStatus(data?.quality_status)
  return (
    <Block letter="E" title="Qualité alertes" status={status}>
      {!data ? (
        <p style={emptyMsg}>Pas encore de mesure de qualité disponible.</p>
      ) : (
        <div>
          <KvRow first label="Alertes générées (7j)" value={formatInt(data.generated_7d)} hint={`${formatInt(data.generated_24h)} sur 24h · ${formatInt(data.distinct_tickers_7d)} actifs distincts`} />
          <KvRow label="Taux actionnable (30j)" value={formatPct(data.actionable_rate_pct)} hint={`${formatInt(data.done_30d)} traitées · ${formatInt(data.dismissed_30d)} ignorées`} />
          <KvRow label="Taux de bruit (30j)" value={formatPct(data.noise_rate_pct)} hint={`${formatInt(data.expired_30d)} expirées · ${formatInt(data.obsolete_30d)} obsolètes`} />
          <KvRow label="Performance moteur 7j" value={formatPct(data.win_rate_d7_pct)} hint={`${formatInt(data.wins_d7)} gains · ${formatInt(data.losses_d7)} pertes · ${formatInt(data.neutral_d7)} neutres`} />
          <KvRow label="Alertes ouvertes" value={formatInt(data.open_30d)} hint={`${formatInt(data.stale_open_14d)} ouvertes depuis > 14j`} />
        </div>
      )}
    </Block>
  )
}

const emptyMsg = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--ink-secondary)',
} as const
