import type { CSSProperties } from 'react'
import { Block } from '../Block'
import type { ArchitectureDecisionRow } from '@/lib/control/types'
import { relativeTime } from '@/lib/control/relativeTime'

interface AdrFeedBlockProps {
  adrs: ArchitectureDecisionRow[]
  now: Date
}

export function AdrFeedBlock({ adrs, now }: AdrFeedBlockProps) {
  return (
    <Block letter="F" title="Décisions doctrine" status="NEUTRAL" defaultExpanded>
      {adrs.length === 0 ? (
        <p style={emptyMsg}>Aucune décision récente.</p>
      ) : (
        <ul style={listReset}>
          {adrs.slice(0, 5).map((adr, i) => (
            <li
              key={adr.decision_number}
              style={{ ...itemRow, borderTop: i === 0 ? 'none' : '1px solid var(--border-subtle)' }}
            >
              <span style={dateCol}>{relativeTime(adr.decided_at, now)}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={titleCol}>
                  <span style={numberBadge}>ADR-{adr.decision_number}</span>
                  <span>{adr.title}</span>
                </span>
                <span style={statusCol}>{labelForStatus(adr.status)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Block>
  )
}

function labelForStatus(s: string | null | undefined): string {
  if (!s) return ''
  const k = s.toLowerCase()
  if (k === 'accepted') return 'Adoptée'
  if (k === 'proposed') return 'Proposée'
  if (k === 'superseded') return 'Remplacée'
  if (k === 'deprecated') return 'Dépréciée'
  if (k === 'rejected') return 'Rejetée'
  return s
}

const emptyMsg: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--ink-secondary)',
}

const listReset: CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
}

const itemRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '92px minmax(0, 1fr)',
  gap: 12,
  padding: '10px 0',
  alignItems: 'flex-start',
}

const dateCol: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-tertiary)',
  paddingTop: 2,
}

const titleCol: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'baseline',
  gap: 8,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  lineHeight: 1.35,
}

const numberBadge: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--gold)',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
}

const statusCol: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
}
