'use client'

// Inline price-target editor. UI-only, no calculation, no derivation.
// Quantity / amount fields are tucked under a collapsed accordion to
// avoid forcing the user — per the v3.0.5 brief.

import { useEffect, useState } from 'react'

export interface PriceTargetModalValue {
  target_price: number
  target_quantity?: number
  target_amount_eur?: number
}

interface PriceTargetModalProps {
  open: boolean
  ticker?: string
  currency?: string
  /** Pre-filled target price (typically Z2 from the signal). */
  suggestedPrice?: number | null
  /** Existing values when editing an existing target. */
  initial?: Partial<PriceTargetModalValue> | null
  /** Title override (e.g. "Définir un prix cible" / "Modifier le prix"). */
  title?: string
  /** Submit label (e.g. "Enregistrer" / "Mettre à jour"). */
  submitLabel?: string
  /** Disable Save while a network call is pending. */
  saving?: boolean
  onClose: () => void
  onSubmit: (value: PriceTargetModalValue) => void
}

export function PriceTargetModal({
  open,
  ticker,
  currency,
  suggestedPrice,
  initial,
  title = 'Définir un prix cible',
  submitLabel = 'Enregistrer',
  saving = false,
  onClose,
  onSubmit,
}: PriceTargetModalProps) {
  const [price, setPrice] = useState<string>('')
  const [quantity, setQuantity] = useState<string>('')
  const [amount, setAmount] = useState<string>('')
  const [optionalOpen, setOptionalOpen] = useState<boolean>(false)

  useEffect(() => {
    if (!open) return
    const initialPrice =
      initial?.target_price ?? (typeof suggestedPrice === 'number' ? suggestedPrice : '')
    setPrice(initialPrice === '' ? '' : String(initialPrice))
    setQuantity(initial?.target_quantity != null ? String(initial.target_quantity) : '')
    setAmount(initial?.target_amount_eur != null ? String(initial.target_amount_eur) : '')
    setOptionalOpen(
      Boolean(initial?.target_quantity != null || initial?.target_amount_eur != null),
    )
  }, [open, initial, suggestedPrice])

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

  const priceNumber = Number(price)
  const canSubmit = !saving && Number.isFinite(priceNumber) && priceNumber > 0

  function submit() {
    if (!canSubmit) return
    const payload: PriceTargetModalValue = { target_price: priceNumber }
    const q = Number(quantity)
    const a = Number(amount)
    if (quantity.trim() && Number.isFinite(q) && q > 0) payload.target_quantity = q
    if (amount.trim() && Number.isFinite(a) && a > 0) payload.target_amount_eur = a
    onSubmit(payload)
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
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-modal="PriceTargetModal"
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
          Prix cible
        </span>

        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 22,
            fontWeight: 500,
            color: 'var(--ink-primary)',
            letterSpacing: 'var(--tracking-display)',
          }}
        >
          {ticker ? `${title} — ${ticker}` : title}
        </h2>

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
            Prix cible{currency ? ` (${currency})` : ''}
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="any"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={saving}
            placeholder={suggestedPrice ? String(suggestedPrice) : '0.00'}
            style={{
              minHeight: 44,
              borderRadius: 8,
              border: '1px solid var(--border-subtle)',
              padding: '8px 10px',
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 14,
              color: 'var(--ink-primary)',
              background: 'var(--surface)',
            }}
          />
          {suggestedPrice ? (
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 11,
                color: 'var(--ink-tertiary)',
              }}
            >
              Suggestion Z2 : {suggestedPrice}
            </span>
          ) : null}
        </label>

        <button
          type="button"
          onClick={() => setOptionalOpen((v) => !v)}
          aria-expanded={optionalOpen}
          style={{
            alignSelf: 'flex-start',
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: 'var(--ink-secondary)',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 500,
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
          }}
        >
          {optionalOpen ? 'Masquer quantité / montant' : 'Préciser quantité / montant (optionnel)'}
        </button>

        {optionalOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                Quantité (optionnel)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={saving}
                style={{
                  minHeight: 40,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 13,
                  color: 'var(--ink-primary)',
                  background: 'var(--surface)',
                }}
              />
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
                Montant EUR (optionnel)
              </span>
              <input
                type="number"
                inputMode="decimal"
                step="any"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={saving}
                style={{
                  minHeight: 40,
                  borderRadius: 8,
                  border: '1px solid var(--border-subtle)',
                  padding: '6px 10px',
                  fontFamily: 'var(--font-editorial-mono)',
                  fontSize: 13,
                  color: 'var(--ink-primary)',
                  background: 'var(--surface)',
                }}
              />
            </label>
          </div>
        ) : null}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4 }}>
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
            onClick={submit}
            disabled={!canSubmit}
            style={{
              minHeight: 44,
              borderRadius: 8,
              padding: '10px 16px',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              background: canSubmit ? 'var(--forest-green)' : 'var(--ink-muted)',
              color: '#FFFFFF',
              border: `1px solid ${canSubmit ? 'var(--forest-green)' : 'var(--ink-muted)'}`,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? 'Enregistrement…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
