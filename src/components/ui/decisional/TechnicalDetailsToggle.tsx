'use client'

import { useId, useState } from 'react'
import type { DecisionTechnicalDetail } from '@/types/decision'
import { getToneStyle } from './tones'

interface TechnicalDetailsToggleProps {
  details: DecisionTechnicalDetail[]
  /** Defaults to false (folded by design). */
  defaultOpen?: boolean
  label?: string
}

export function TechnicalDetailsToggle({
  details,
  defaultOpen = false,
  label = 'Détails techniques',
}: TechnicalDetailsToggleProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  if (!details || details.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="self-start transition-colors duration-150"
        style={{
          background: 'transparent',
          color: 'var(--ink-secondary)',
          border: 'none',
          padding: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.02em',
          textDecoration: 'underline',
          textDecorationColor: 'var(--border-subtle)',
          textUnderlineOffset: 3,
          cursor: 'pointer',
        }}
      >
        {open ? `Masquer ${label.toLowerCase()}` : `Voir ${label.toLowerCase()}`}
        <span aria-hidden style={{ marginLeft: 6 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <dl
          id={panelId}
          className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2"
          style={{
            background: 'var(--canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '10px 12px',
          }}
        >
          {details.map((d, idx) => {
            const tone = d.tone ? getToneStyle(d.tone) : null
            return (
              <div key={`${d.label}-${idx}`} className="flex items-baseline justify-between gap-3 py-1">
                <dt
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 10,
                    color: 'var(--ink-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  {d.label}
                </dt>
                <dd
                  style={{
                    fontFamily: 'var(--font-editorial-mono)',
                    fontSize: 12,
                    fontWeight: 500,
                    color: tone ? tone.color : 'var(--ink-primary)',
                    margin: 0,
                  }}
                >
                  {d.value}
                </dd>
              </div>
            )
          })}
        </dl>
      ) : null}
    </div>
  )
}
