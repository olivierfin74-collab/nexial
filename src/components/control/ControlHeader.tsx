import type { CSSProperties } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { RefreshButton } from './RefreshButton'
import { formatHeaderTimestamp } from '@/lib/control/relativeTime'

interface ControlHeaderProps {
  now: Date
}

export function ControlHeader({ now }: ControlHeaderProps) {
  return (
    <header
      data-shell="ControlHeader"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'rgba(251, 249, 244, 0.94)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '12px 14px',
      }}
    >
      <div style={topRow}>
        <Link href="/aujourdhui" aria-label="Retour vers Nexial" style={backLink}>
          <ChevronLeft size={16} aria-hidden />
          <span>Nexial</span>
        </Link>
        <span style={titleStyle}>Control</span>
        <RefreshButton />
      </div>
      <p style={timestampStyle}>{formatHeaderTimestamp(now.toISOString())}</p>
    </header>
  )
}

const topRow: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'auto 1fr auto',
  alignItems: 'center',
  gap: 12,
  minHeight: 36,
}

const backLink: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  minHeight: 36,
  padding: '0 10px 0 4px',
  borderRadius: 8,
  color: 'var(--ink-secondary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 600,
  textDecoration: 'none',
}

const titleStyle: CSSProperties = {
  justifySelf: 'center',
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 17,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  letterSpacing: '-0.01em',
}

const timestampStyle: CSSProperties = {
  margin: '6px 0 0',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  color: 'var(--ink-tertiary)',
  textAlign: 'center',
  letterSpacing: '0.04em',
}
