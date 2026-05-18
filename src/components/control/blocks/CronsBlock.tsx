import { Block } from '../Block'
import { KvRow } from '../KvRow'
import type { ControlStatus, CronRunLogRow } from '@/lib/control/types'
import { formatInt } from '@/lib/control/wording'
import { relativeTime } from '@/lib/control/relativeTime'

interface CronsBlockProps {
  runs: CronRunLogRow[]
  cronsActive: number | null | undefined
  intradayActive: number | null | undefined
  eodActive: number | null | undefined
  now: Date
}

function summarize(runs: CronRunLogRow[]): ControlStatus {
  if (!runs.length) return 'NEUTRAL'
  const last24h = runs.filter((r) => {
    const t = new Date(r.started_at).getTime()
    return Number.isFinite(t) && Date.now() - t < 24 * 3600 * 1000
  })
  if (!last24h.length) return 'NEUTRAL'
  const errors = last24h.filter((r) => isErrorStatus(r.status))
  if (errors.length === 0) return 'HEALTHY'
  if (errors.length / last24h.length > 0.2) return 'CRITICAL'
  return 'DEGRADED'
}

function isErrorStatus(s: string | null): boolean {
  if (!s) return false
  const up = s.toUpperCase()
  return up !== 'SUCCESS' && up !== 'OK' && up !== 'COMPLETED'
}

export function CronsBlock({ runs, cronsActive, intradayActive, eodActive, now }: CronsBlockProps) {
  const status = summarize(runs)
  const last24h = runs.filter((r) => now.getTime() - new Date(r.started_at).getTime() < 24 * 3600 * 1000)
  const errors24h = last24h.filter((r) => isErrorStatus(r.status))
  const lastSuccess = runs.find((r) => !isErrorStatus(r.status))

  return (
    <Block letter="C" title="Tâches planifiées" status={status}>
      <div>
        <KvRow first label="Tâches actives" value={formatInt(cronsActive)} hint={`${formatInt(intradayActive)} intraday · ${formatInt(eodActive)} clôture`} />
        <KvRow label="Exécutions 24h" value={formatInt(last24h.length)} hint={`${formatInt(errors24h.length)} en erreur`} />
        <KvRow label="Dernière exécution réussie" value={lastSuccess ? relativeTime(lastSuccess.started_at, now) : '—'} hint={lastSuccess?.job_name ?? undefined} />
      </div>
    </Block>
  )
}
