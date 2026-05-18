import { Block } from '../Block'
import { KvRow } from '../KvRow'
import type { EngineHealthCalibrated } from '@/lib/control/types'
import { formatInt, formatPct, humanizeReason, normalizeStatus } from '@/lib/control/wording'

interface EngineBlockProps {
  data: EngineHealthCalibrated | null
}

export function EngineBlock({ data }: EngineBlockProps) {
  const status = normalizeStatus(data?.calibrated_status)
  const reason = humanizeReason(data?.status_reason)

  return (
    <Block letter="A" title="Moteur" status={status}>
      {!data ? (
        <p style={emptyMsg}>Données moteur indisponibles pour le moment.</p>
      ) : (
        <>
          {reason ? <p style={reasonMsg}>{reason}</p> : null}
          <div>
            <KvRow first label="Performance moteur 7j" value={formatPct(data.win_rate_d7_pct)} hint={`${formatInt(data.wins_d7)} gains · ${formatInt(data.losses_d7)} pertes`} />
            <KvRow label="Tâches actives" value={formatInt(data.total_crons_active)} hint={`${formatInt(data.had_hiccups_but_ok)} avec hoquets résolus · ${formatInt(data.currently_broken)} cassées`} />
            <KvRow label="Anomalies à traiter" value={formatInt(data.criticals_open)} hint={`${formatInt(data.criticals_7d)} sur 7j · ${formatInt(data.warnings_7d)} alertes mineures`} />
            <KvRow label="Versions de scoring actives" value={`${formatInt(data.scoring_versions_active)} / ${formatInt(data.scoring_versions_total)}`} />
            <KvRow label="Agents actifs (7j)" value={formatInt(data.agents_active_7d)} hint={`${formatInt(data.agents_active_24h)} sur 24h`} />
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
