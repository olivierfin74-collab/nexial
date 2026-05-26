import type { CSSProperties } from 'react'
import { ControlHeader } from './ControlHeader'
import type {
  ControlDataFreshnessRow,
  ControlFeedRow,
  ControlVerdictRow,
  DataFreshnessFeu,
  OfficialControlState,
} from '@/lib/control/types'
import { relativeTime } from '@/lib/control/relativeTime'

interface ControlSurfaceProps {
  verdict: ControlVerdictRow | null
  feed: ControlFeedRow[]
  dataFreshness: ControlDataFreshnessRow[]
  error: string | null
  now: Date
}

type Tone = 'green' | 'red' | 'amber' | 'gray'

export function ControlSurface({ verdict, feed, dataFreshness, error, now }: ControlSurfaceProps) {
  const allClear = verdict?.all_clear === true
  const headline = readLabel(verdict, ['headline_fr', 'headline']) ??
    (allClear ? 'Tout est clair' : 'Control indisponible')
  const detail = readLabel(verdict, ['detail_fr', 'detail'])
  const state = verdict?.control_state ?? (allClear ? 'HEALTHY' : 'INFO')
  const tone = allClear ? 'green' : toneForState(state)
  const measuredAt = readLabel(verdict, ['generated_at', 'computed_at'])

  return (
    <div
      data-shell="ControlSurface"
      style={{
        minHeight: '100vh',
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
      }}
    >
      <ControlHeader now={now} />
      <main style={surface}>
        {error ? <p style={errorStyle}>{error}</p> : null}

        <section style={{ ...verdictCard, borderColor: borderForTone(tone), background: bgForTone(tone) }}>
          <div style={verdictLine}>
            <span style={{ ...dot, background: colorForTone(tone) }} aria-hidden />
            <h1 style={headlineStyle}>{headline}</h1>
          </div>
          {measuredAt ? <p style={timestamp}>Mesure {relativeTime(measuredAt, now)}</p> : null}
          {detail ? (
            <details style={detailsStyle}>
              <summary style={summaryStyle}>Detail</summary>
              <p style={detailStyle}>{detail}</p>
            </details>
          ) : null}
        </section>

        {!allClear && feed.length > 0 ? (
          <section style={feedSection}>
            <h2 style={feedTitle}>Feed control</h2>
            <div style={feedStack}>
              {feed.map((item, index) => (
                <ControlFeedItem key={itemKey(item, index)} item={item} />
              ))}
            </div>
          </section>
        ) : null}

        <DataFreshnessPanel rows={dataFreshness} />
      </main>
    </div>
  )
}

function DataFreshnessPanel({ rows }: { rows: ControlDataFreshnessRow[] }) {
  const groups = groupFreshnessByCategory(rows)
  const globalFeu = strongestFeu(rows.map((row) => row.feu))
  const globalTone = toneForFeu(globalFeu)

  return (
    <section style={{ ...freshnessSection, borderColor: borderForTone(globalTone), background: bgForTone(globalTone) }}>
      <details>
        <summary style={freshnessSummary}>
          <span style={freshnessTitleLine}>
            <span style={{ ...dot, background: colorForTone(globalTone) }} aria-hidden />
            <span style={freshnessTitle}>Fraîcheur des données</span>
          </span>
          <span style={{ ...statePill, color: colorForTone(globalTone), background: 'var(--surface)' }}>
            {globalFeu}
          </span>
        </summary>

        <div style={categoryStack}>
          {groups.map((group) => {
            const categoryFeu = strongestFeu(group.rows.map((row) => row.feu))
            const categoryTone = toneForFeu(categoryFeu)

            return (
              <details key={group.category} style={{ ...categoryDetails, borderColor: borderForTone(categoryTone) }}>
                <summary style={categorySummary}>
                  <span style={categoryName}>{group.category}</span>
                  <span style={{ ...statePill, color: colorForTone(categoryTone), background: bgForTone(categoryTone) }}>
                    {categoryFeu}
                  </span>
                </summary>

                <div style={freshnessRows}>
                  {group.rows.map((row, index) => (
                    <FreshnessDetail key={freshnessKey(row, index)} row={row} />
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      </details>
    </section>
  )
}

function FreshnessDetail({ row }: { row: ControlDataFreshnessRow }) {
  const tone = toneForFeu(row.feu)

  return (
    <article style={freshnessDetail}>
      <div style={feedItemHead}>
        <span style={cronName}>{row.cron_name ?? 'Cron non renseigne'}</span>
        <span style={{ ...statePill, color: colorForTone(tone), background: bgForTone(tone) }}>
          {row.feu ?? 'GREEN'}
        </span>
      </div>
      <dl style={freshnessGrid}>
        <div style={metricItem}>
          <dt style={metricLabel}>Dernière màj</dt>
          <dd style={metricValue}>{formatParisTimestamp(row.last_data_at)}</dd>
        </div>
        <div style={metricItem}>
          <dt style={metricLabel}>Prochaine</dt>
          <dd style={metricValue}>{formatParisTimestamp(row.next_run_at) ?? 'récurrent'}</dd>
        </div>
      </dl>
    </article>
  )
}

function ControlFeedItem({ item }: { item: ControlFeedRow }) {
  const state = item.control_state ?? 'INFO'
  const tone = toneForState(state)
  const title = readLabel(item, ['title_fr', 'title', 'headline_fr', 'headline']) ?? 'Point control'
  const detail = readLabel(item, ['detail_fr', 'detail'])
  const source = readLabel(item, ['source'])

  return (
    <article style={{ ...feedItem, borderColor: borderForTone(tone) }}>
      <div style={feedItemHead}>
        <span style={{ ...statePill, color: colorForTone(tone), background: bgForTone(tone) }}>
          {state}
        </span>
        {source ? <span style={sourceStyle}>{source}</span> : null}
      </div>
      <h3 style={itemTitle}>{title}</h3>
      {detail ? (
        <details style={detailsStyle}>
          <summary style={summaryStyle}>Detail</summary>
          <p style={detailStyle}>{detail}</p>
        </details>
      ) : null}
    </article>
  )
}

function toneForState(state: OfficialControlState | null | undefined): Tone {
  switch ((state ?? '').toUpperCase()) {
    case 'ACTION':
    case 'NEEDS_OLIVIER':
      return 'red'
    case 'WATCH':
    case 'IN_PROGRESS':
      return 'amber'
    case 'HEALTHY':
      return 'green'
    case 'AUTO_HANDLED':
    case 'INFO':
    default:
      return 'gray'
  }
}

function toneForFeu(feu: DataFreshnessFeu | null | undefined): Tone {
  switch ((feu ?? '').toUpperCase()) {
    case 'RED':
      return 'red'
    case 'ORANGE':
      return 'amber'
    case 'GREEN':
      return 'green'
    default:
      return 'gray'
  }
}

function strongestFeu(values: Array<DataFreshnessFeu | null | undefined>): 'GREEN' | 'ORANGE' | 'RED' {
  const normalized = values.map((value) => (value ?? '').toUpperCase())
  if (normalized.includes('RED')) return 'RED'
  if (normalized.includes('ORANGE')) return 'ORANGE'
  return 'GREEN'
}

function groupFreshnessByCategory(rows: ControlDataFreshnessRow[]) {
  const groups = new Map<string, ControlDataFreshnessRow[]>()

  for (const row of rows) {
    const category = row.categorie?.trim() || 'Sans categorie'
    const existing = groups.get(category)
    if (existing) {
      existing.push(row)
    } else {
      groups.set(category, [row])
    }
  }

  return Array.from(groups, ([category, groupRows]) => ({ category, rows: groupRows }))
}

function formatParisTimestamp(value: string | null): string | null {
  if (!value) return null
  const date = new Date(asUtcTimestamp(value))
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date)
}

function asUtcTimestamp(value: string): string {
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return value
  return `${value}Z`
}

function freshnessKey(row: ControlDataFreshnessRow, index: number): string {
  return `${row.categorie ?? 'categorie'}-${row.cron_name ?? 'cron'}-${index}`
}

function readLabel(row: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!row) return null
  for (const key of keys) {
    const value = row[key]
    if (typeof value === 'string' && value.trim()) return value
    if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  }
  return null
}

function itemKey(item: ControlFeedRow, index: number): string {
  const id = item.id
  if (typeof id === 'string' && id) return id
  if (typeof id === 'number') return String(id)
  return `${item.control_state ?? 'control'}-${item.sort_priority ?? index}-${index}`
}

function colorForTone(tone: Tone): string {
  if (tone === 'green') return 'var(--forest-green)'
  if (tone === 'red') return 'var(--burgundy)'
  if (tone === 'amber') return 'var(--amber)'
  return 'var(--ink-tertiary)'
}

function borderForTone(tone: Tone): string {
  if (tone === 'green') return 'rgba(45, 95, 63, 0.20)'
  if (tone === 'red') return 'rgba(122, 56, 56, 0.22)'
  if (tone === 'amber') return 'rgba(184, 134, 11, 0.22)'
  return 'var(--border-subtle)'
}

function bgForTone(tone: Tone): string {
  if (tone === 'green') return 'rgba(45, 95, 63, 0.06)'
  if (tone === 'red') return 'rgba(122, 56, 56, 0.06)'
  if (tone === 'amber') return 'rgba(184, 134, 11, 0.06)'
  return 'rgba(0, 0, 0, 0.025)'
}

const surface: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '12px 16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const verdictCard: CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const verdictLine: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '12px minmax(0, 1fr)',
  alignItems: 'center',
  gap: 10,
}

const dot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: 999,
}

const headlineStyle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 22,
  fontWeight: 500,
  lineHeight: 1.14,
  color: 'var(--ink-primary)',
}

const timestamp: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.04em',
}

const detailsStyle: CSSProperties = {
  marginTop: 2,
}

const summaryStyle: CSSProperties = {
  minHeight: 34,
  display: 'inline-flex',
  alignItems: 'center',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--ink-secondary)',
  cursor: 'pointer',
}

const detailStyle: CSSProperties = {
  margin: '0 0 2px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  lineHeight: 1.45,
  color: 'var(--ink-secondary)',
}

const feedSection: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const feedTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const feedStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const feedItem: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: '11px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 7,
}

const feedItemHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
}

const statePill: CSSProperties = {
  borderRadius: 999,
  padding: '3px 7px',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 9.5,
  fontWeight: 800,
  letterSpacing: '0.05em',
}

const sourceStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const itemTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.35,
  color: 'var(--ink-primary)',
}

const errorStyle: CSSProperties = {
  margin: 0,
  background: 'rgba(122, 56, 56, 0.06)',
  border: '1px solid rgba(122, 56, 56, 0.18)',
  borderRadius: 10,
  padding: '10px 12px',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  lineHeight: 1.4,
  color: 'var(--burgundy)',
  wordBreak: 'break-word',
}

const freshnessSection: CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 12,
  padding: '12px 14px',
}

const freshnessSummary: CSSProperties = {
  minHeight: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  cursor: 'pointer',
}

const freshnessTitleLine: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  minWidth: 0,
}

const freshnessTitle: CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 19,
  fontWeight: 500,
  lineHeight: 1.18,
  color: 'var(--ink-primary)',
}

const categoryStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 10,
}

const categoryDetails: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: '9px 10px',
}

const categorySummary: CSSProperties = {
  minHeight: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  cursor: 'pointer',
}

const categoryName: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1.3,
  color: 'var(--ink-primary)',
  minWidth: 0,
}

const freshnessRows: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  marginTop: 8,
}

const freshnessDetail: CSSProperties = {
  borderTop: '1px solid var(--border-subtle)',
  paddingTop: 9,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const cronName: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-secondary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

const freshnessGrid: CSSProperties = {
  margin: 0,
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 8,
}

const metricItem: CSSProperties = {
  minWidth: 0,
}

const metricLabel: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 9.5,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

const metricValue: CSSProperties = {
  margin: '3px 0 0',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--ink-primary)',
}
