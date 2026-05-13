'use client'

// UI-only placeholder for the entry-plan modal triggered by a backend
// dispatch with redirect_kind === 'open_ladder_modal' (action_codes
// BUY / BUY_MORE / BUY_SMALL).
//
// This component MUST NOT:
//   - compute prices, sizing, ladders or any financial value
//   - call a backend RPC
//   - persist or send an order
//   - rephrase the backend verdict
//
// Its only job is to confirm the click and tell the user the dedicated
// builder is coming. The real LadderBuilder will replace this file.

import { useEffect } from 'react'
import type { DispatchModalContext } from '@/types/decision'

interface LadderBuilderModalProps {
  open: boolean
  context: DispatchModalContext | null
  onClose: () => void
}

export function LadderBuilderModal({ open, context, onClose }: LadderBuilderModalProps) {
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
      aria-label="Plan d’entrée"
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
        data-modal="LadderBuilderModal"
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
          Plan d’entrée
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
          {context?.ticker ? `Plan d’entrée — ${context.ticker}` : 'Plan d’entrée'}
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
          Plan d’entrée bientôt disponible. Le constructeur dédié sera ajouté dans une prochaine version — aucune action de marché n’a été déclenchée.
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
              background: 'var(--forest-green)',
              color: '#FFFFFF',
              border: '1px solid var(--forest-green)',
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
