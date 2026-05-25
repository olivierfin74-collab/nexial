import type { CSSProperties } from 'react'
import { ControlHeader } from './ControlHeader'
import type { ControlFeedRow, ControlVerdictRow, OfficialControlState } from '@/lib/control/types'
import { relativeTime } from '@/lib/control/relativeTime'

interface ControlSurfaceProps {
  verdict: ControlVerdictRow | null
  feed: ControlFeedRow[]
  error: string | null
  now: Date
}

type Tone = 'green' | 'red' | 'amber' | 'gray'

export function ControlSurface({ verdict, feed, error, now }: ControlSurfaceProps) {
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
      </main>
    </div>
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
