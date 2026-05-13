'use client'

// UI-only placeholder for the exit-plan modal triggered by a backend
// dispatch with redirect_kind === 'open_exit_modal' (action_codes
// SELL / TRIM).
//
// This component MUST NOT:
//   - compute a target price, a sizing or a sell schedule
//   - call a backend RPC
//   - persist or send an order
//   - rephrase the backend verdict
//
// Its only job is to confirm the click and tell the user the dedicated
// exit planner is coming. The real ExitPlan UI will replace this file.

import { useEffect } from 'react'
import type { DispatchModalContext } from '@/types/decision'

interface ExitPlanModalProps {
  open: boolean
  context: DispatchModalContext | null
  onClose: () => void
}

export function ExitPlanModal({ open, context, onClose }: ExitPlanModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Plan de sortie"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(10,10,10,0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-modal="ExitPlanModal"
        data-action-code={context?.action_code ?? ''}
        style={{
          width: '100%',
          maxWidth: 420,
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 18px 54px rgba(10,10,10,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 10,
            color: 'var(--ink-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          Plan de sortie
        </span>

        <h2
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--ink-primary)',
            margin: 0,
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          {context?.ticker ? `Plan de sortie — ${context.ticker}` : 'Plan de sortie'}
        </h2>

        <p
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 14,
            color: 'var(--ink-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          Plan de sortie bientôt disponible. Le constructeur dédié sera ajouté dans une prochaine version — aucune action de marché n’a été déclenchée.
        </p>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            style={{
              minHeight: 40,
              borderRadius: 8,
              padding: '8px 16px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              background: 'var(--burgundy)',
              color: '#FFFFFF',
              border: '1px solid var(--burgundy)',
              cursor: 'pointer',
            }}
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
