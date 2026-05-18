'use client'

import { useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import type { ControlStatus } from '@/lib/control/types'
import { StatusPill } from './StatusPill'

interface BlockProps {
  letter: string
  title: string
  status: ControlStatus
  statusLabel?: string
  defaultExpanded?: boolean
  children: ReactNode
}

export function Block({ letter, title, status, statusLabel, defaultExpanded = false, children }: BlockProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const Chevron = expanded ? ChevronUp : ChevronDown
  const panelId = `nx-block-${letter.toLowerCase()}`

  return (
    <section
      data-block={letter}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={panelId}
        style={{
          width: '100%',
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          font: 'inherit',
          color: 'inherit',
        }}
      >
        <span style={letterStyle}>{letter}</span>
        <span style={titleStyle}>{title}</span>
        <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <StatusPill status={status} label={statusLabel} size="sm" />
          <Chevron size={18} aria-hidden style={{ color: 'var(--ink-tertiary)' }} />
        </span>
      </button>
      <div
        id={panelId}
        hidden={!expanded}
        style={{
          padding: expanded ? '0 14px 14px' : 0,
          borderTop: expanded ? '1px solid var(--border-subtle)' : 'none',
          animation: expanded ? 'nx-block-in 200ms ease-out' : undefined,
        }}
      >
        {expanded ? <div style={{ paddingTop: 12 }}>{children}</div> : null}
      </div>
      <style>{`@keyframes nx-block-in { from { opacity: 0; transform: translateY(-2px) } to { opacity: 1; transform: none } }`}</style>
    </section>
  )
}

const letterStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gold)',
  letterSpacing: '0.08em',
  minWidth: 16,
}

const titleStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  letterSpacing: '-0.01em',
  flex: '1 1 auto',
}
