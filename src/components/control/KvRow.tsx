import type { CSSProperties, ReactNode } from 'react'

interface KvRowProps {
  label: string
  value: ReactNode
  hint?: string
  /** Première ligne sans border-top supérieur. */
  first?: boolean
}

export function KvRow({ label, value, hint, first }: KvRowProps) {
  return (
    <div style={{ ...row, borderTop: first ? 'none' : '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={labelStyle}>{label}</span>
        {hint ? <span style={hintStyle}>{hint}</span> : null}
      </div>
      <span style={valueStyle}>{value}</span>
    </div>
  )
}

const row: CSSProperties = {
  minHeight: 38,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'center',
  padding: '8px 0',
}

const labelStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--ink-primary)',
}

const hintStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11.5,
  color: 'var(--ink-secondary)',
}

const valueStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  color: 'var(--ink-primary)',
  textAlign: 'right',
  whiteSpace: 'nowrap',
}
