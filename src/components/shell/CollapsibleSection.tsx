'use client'

// Generic collapsible group used on /aujourdhui, /sniper and /dashboard
// to give Olivier a stable "outline" view that survives data refetches
// (open/closed state is local React state, not derived from props).
//
// Pure presentational. No fetch, no metier logic.

import { useState, type ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface CollapsibleSectionProps {
  /** Section title. */
  title: string
  /** Optional count chip rendered next to the title. */
  count?: number | string | null
  /** Optional subtitle line shown under the title when expanded. */
  subtitle?: string | null
  /** Initial open state. Defaults to true so groups are visible on first
   *  paint and only fold after an explicit user tap. */
  defaultOpen?: boolean
  /** Optional marker hung in the html for QA. */
  groupKey?: string
  children: ReactNode
}

export function CollapsibleSection({
  title,
  count = null,
  subtitle = null,
  defaultOpen = true,
  groupKey,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const Chevron = open ? ChevronDown : ChevronRight

  return (
    <section
      data-collapsible={groupKey ?? title}
      data-open={open ? 'true' : 'false'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Chevron size={16} aria-hidden style={{ color: 'var(--ink-tertiary)' }} />
          <span
            style={{
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 17,
              fontWeight: 500,
              color: 'var(--ink-primary)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {title}
          </span>
        </span>
        {count != null && count !== '' ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              minWidth: 18,
              textAlign: 'right',
            }}
          >
            {count}
          </span>
        ) : null}
      </button>

      {open && subtitle ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      ) : null}

      {open ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div> : null}
    </section>
  )
}
