'use client'

// UI-only placeholder for the thesis editor modal triggered by a backend
// dispatch with redirect_kind === 'open_thesis_modal' (REVIEW_THESIS) or
// 'open_thesis_modal_urgent' (REVIEW_URGENT).
//
// This component MUST NOT:
//   - persist a thesis or any conviction
//   - call a backend RPC
//   - rephrase the backend verdict or invent recommendations
//
// Its only job is to confirm the click and tell the user the full thesis
// editor is coming. The real ThesisEditor will replace this file (and call
// /api/thesis/[assetId] under the hood).

import { useEffect } from 'react'
import type { DispatchModalContext } from '@/types/decision'

interface ThesisEditorModalProps {
  open: boolean
  /** true when redirect_kind === 'open_thesis_modal_urgent'. */
  urgent?: boolean
  context: DispatchModalContext | null
  onClose: () => void
}

export function ThesisEditorModal({
  open,
  urgent = false,
  context,
  onClose,
}: ThesisEditorModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const title = urgent ? 'Thèse à revoir en priorité' : 'Définir la thèse'
  const accent = urgent ? 'var(--burgundy)' : 'var(--forest-green)'
  const banner = urgent ? context?.urgency_banner_fr ?? null : null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
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
        data-modal="ThesisEditorModal"
        data-urgent={urgent ? 'true' : 'false'}
        data-action-code={context?.action_code ?? ''}
        style={{
          width: '100%',
          maxWidth: 440,
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
          Thèse
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
          {context?.ticker ? `${title} — ${context.ticker}` : title}
        </h2>

        {banner ? (
          <div
            style={{
              borderRadius: 8,
              background: 'var(--contre-bg)',
              border: '1px solid var(--burgundy-light)',
              color: 'var(--burgundy)',
              padding: '8px 10px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              fontWeight: 600,
              lineHeight: 1.4,
            }}
          >
            {banner}
          </div>
        ) : null}

        <p
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 14,
            color: 'var(--ink-secondary)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          La modification complète de la thèse sera disponible bientôt. L’éditeur dédié sera ajouté dans une prochaine version — aucune modification n’a été enregistrée.
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
              background: accent,
              color: '#FFFFFF',
              border: `1px solid ${accent}`,
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
