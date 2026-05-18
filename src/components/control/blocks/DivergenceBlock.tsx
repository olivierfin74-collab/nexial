import { Block } from '../Block'
import { KvRow } from '../KvRow'
import type { DivergenceTrackingKpis } from '@/lib/control/types'
import { formatInt, formatPct, normalizeStatus, statusExplanation } from '@/lib/control/wording'
import { relativeTime } from '@/lib/control/relativeTime'

interface DivergenceBlockProps {
  data: DivergenceTrackingKpis | null
  now: Date
}

export function DivergenceBlock({ data, now }: DivergenceBlockProps) {
  const status = normalizeStatus(data?.tracking_status)
  const explanation = statusExplanation(data?.tracking_status)

  return (
    <Block letter="D" title="Divergences" status={status} defaultExpanded>
      {!data ? (
        <p style={emptyMsg}>Aucune divergence mesurée pour le moment.</p>
      ) : (
        <>
          {explanation ? <p style={reasonMsg}>{explanation}</p> : null}
          <div>
            <KvRow first label="Décisions suivies" value={formatInt(data.total_decisions_alltime)} hint={`${formatInt(data.total_decisions_30d)} sur 30j · ${formatInt(data.total_decisions_7d)} sur 7j`} />
            <KvRow label="Taux de divergence" value={formatPct(data.divergence_rate_pct)} hint="Part des décisions où Nexial diverge" />
            <KvRow label="Résolution à 5 jours" value={formatPct(data.resolution_rate_pct)} hint={`${formatInt(data.resolved_d5)} cas tranchés · ${formatInt(data.pending_outcome)} en attente`} />
            <KvRow label="Nexial a évité une perte" value={formatInt(data.nexial_right_loss_avoided)} />
            <KvRow label="Nexial a manqué un gain" value={formatInt(data.nexial_wrong_gain_missed)} />
            <KvRow label="Dernière session" value={data.last_session_at ? relativeTime(data.last_session_at, now) : '—'} hint={data.last_session_tag ?? undefined} />
          </div>
        </>
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

const reasonMsg = {
  margin: '0 0 8px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  lineHeight: 1.4,
  color: 'var(--ink-secondary)',
} as const
