'use client'

// Contextual thesis editor triggered when nx.fn_dispatch_alert_action
// returns:
//   redirect_kind = 'open_thesis_modal'         (REVIEW_THESIS)
//   redirect_kind = 'open_thesis_modal_urgent'  (REVIEW_URGENT)
//
// The modal fetches /api/thesis/{assetId} on open (pass-through to
// nx.fn_review_thesis_for_position) and POSTs the chosen conviction +
// optional thesis_md back to the same route (pass-through to
// nx.fn_set_position_thesis). It NEVER calls Supabase directly, never
// derives a decision, never invents recommendations, never persists
// anything besides the user's explicit input.

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type {
  ConvictionLevel,
  ThesisReviewPayload,
} from '@/types/decision'

interface ThesisEditorModalProps {
  assetId: string | null
  ticker?: string
  urgent?: boolean
  open: boolean
  onClose: () => void
  /** Called after a successful POST. The page typically refetches the inbox. */
  onSaved?: (result: unknown) => void
}

type LoadState = 'idle' | 'loading' | 'ready' | 'error'

export function ThesisEditorModal({
  assetId,
  ticker,
  urgent = false,
  open,
  onClose,
  onSaved,
}: ThesisEditorModalProps) {
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [review, setReview] = useState<ThesisReviewPayload | null>(null)
  const [convictionLevel, setConvictionLevel] = useState<ConvictionLevel>('NEUTRAL')
  const [thesisMd, setThesisMd] = useState('')
  const [saving, setSaving] = useState(false)
  const fetchSeqRef = useRef(0)

  // Reset transient state every time the modal closes.
  useEffect(() => {
    if (open) return
    setReview(null)
    setLoadState('idle')
    setSaving(false)
    setThesisMd('')
    setConvictionLevel('NEUTRAL')
  }, [open])

  // GET review when the modal opens for a given asset.
  useEffect(() => {
    if (!open || !assetId) return
    const seq = ++fetchSeqRef.current
    setLoadState('loading')
    setReview(null)

    fetch(`/api/thesis/${assetId}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        if (seq !== fetchSeqRef.current) return
        const r = (json?.thesis as ThesisReviewPayload | null) ?? null
        if (!r) {
          setLoadState('error')
          return
        }
        setReview(r)
        if (r.current_thesis) {
          setConvictionLevel(r.current_thesis.conviction_level)
          setThesisMd(r.current_thesis.thesis_md ?? '')
        } else if (r.suggested_conviction) {
          setConvictionLevel(r.suggested_conviction)
          setThesisMd('')
        } else {
          setConvictionLevel('NEUTRAL')
          setThesisMd('')
        }
        setLoadState('ready')
      })
      .catch(() => {
        if (seq !== fetchSeqRef.current) return
        setLoadState('error')
      })
  }, [open, assetId])

  // Accessibility: Escape close + background scroll lock.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  const titleBase = urgent ? 'Examiner la thèse' : 'Définir une thèse'
  const title = ticker ? `${titleBase} — ${ticker}` : titleBase
  const accent = urgent ? 'var(--burgundy)' : 'var(--forest-green)'

  const suggestedCode = review?.suggested_conviction ?? null
  const suggested =
    suggestedCode && review
      ? review.available_convictions.find((c) => c.code === suggestedCode) ?? null
      : null
  const qualityRationale = review?.quality?.rationale ?? null

  const canSubmit = loadState === 'ready' && !saving && !!assetId

  async function handleSave() {
    if (!assetId || saving) return
    setSaving(true)
    try {
      const res = await fetch(`/api/thesis/${assetId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conviction_level: convictionLevel,
          thesis_md: thesisMd.trim() ? thesisMd.trim() : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || json?.error) {
        toast.error(
          (json?.error as string | undefined) || 'Action temporairement indisponible',
        )
        setSaving(false)
        return
      }
      const message = (json?.result as { message_fr?: string } | null)?.message_fr
      toast.success(message || 'Thèse enregistrée')
      onSaved?.(json?.result)
      onClose()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Connexion temporairement indisponible',
      )
      setSaving(false)
    }
  }

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
        overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-modal="ThesisEditorModal"
        data-urgent={urgent ? 'true' : 'false'}
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 12,
          padding: 20,
          boxShadow: '0 18px 54px rgba(10,10,10,0.18)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          maxHeight: 'calc(100vh - 32px)',
          overflowY: 'auto',
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
          {title}
        </h2>

        {urgent ? (
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
            Cette position mérite votre attention immédiate.
          </div>
        ) : null}

        {urgent && suggested ? (
          <div
            style={{
              borderRadius: 8,
              background: 'var(--canvas)',
              border: '1px solid var(--border-subtle)',
              padding: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                color: 'var(--ink-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Niveau suggéré
            </span>
            <span
              style={{
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--ink-primary)',
              }}
            >
              {suggested.label_fr}
            </span>
            {qualityRationale ? (
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 12,
                  color: 'var(--ink-secondary)',
                  lineHeight: 1.4,
                }}
              >
                Raison : {qualityRationale}
              </span>
            ) : null}
          </div>
        ) : null}

        {loadState === 'loading' ? (
          <div
            aria-busy="true"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              padding: '8px 0',
            }}
          >
            <span
              style={{
                height: 14,
                width: '40%',
                borderRadius: 4,
                background: 'rgba(0,0,0,0.06)',
              }}
            />
            <span
              style={{
                height: 40,
                width: '100%',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.05)',
              }}
            />
            <span
              style={{
                height: 14,
                width: '30%',
                borderRadius: 4,
                background: 'rgba(0,0,0,0.06)',
              }}
            />
            <span
              style={{
                height: 120,
                width: '100%',
                borderRadius: 8,
                background: 'rgba(0,0,0,0.05)',
              }}
            />
          </div>
        ) : loadState === 'error' ? (
          <p
            role="status"
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              color: 'var(--ink-secondary)',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            Certaines données n’ont pas pu être mises à jour. Vous pouvez réessayer dans un instant.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 10,
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Niveau de conviction
              </span>
              <select
                value={convictionLevel}
                onChange={(e) => setConvictionLevel(e.target.value as ConvictionLevel)}
                disabled={saving}
                style={{
                  minHeight: 44,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  padding: '8px 10px',
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 14,
                  color: 'var(--ink-primary)',
                  background: 'var(--surface)',
                }}
              >
                {(review?.available_convictions ?? []).map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label_fr}
                  </option>
                ))}
              </select>
              {review?.available_convictions.find((c) => c.code === convictionLevel)
                ?.description_fr ? (
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 12,
                    color: 'var(--ink-secondary)',
                    lineHeight: 1.4,
                  }}
                >
                  {
                    review!.available_convictions.find((c) => c.code === convictionLevel)!
                      .description_fr
                  }
                </span>
              ) : null}
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 10,
                  color: 'var(--ink-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                Votre thèse (optionnel)
              </span>
              <textarea
                value={thesisMd}
                onChange={(e) => setThesisMd(e.target.value)}
                disabled={saving}
                rows={6}
                placeholder="Pourquoi vous gardez ou liquidez cette position ?"
                style={{
                  width: '100%',
                  minHeight: 120,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  padding: 10,
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: 'var(--ink-primary)',
                  background: 'var(--surface)',
                  resize: 'vertical',
                }}
              />
            </label>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            style={{
              minHeight: 44,
              borderRadius: 8,
              padding: '10px 16px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--ink-secondary)',
              border: '1px solid var(--border-subtle)',
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSubmit}
            style={{
              minHeight: 44,
              borderRadius: 8,
              padding: '10px 16px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              background: canSubmit ? accent : 'var(--ink-muted)',
              color: '#FFFFFF',
              border: `1px solid ${canSubmit ? accent : 'var(--ink-muted)'}`,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
