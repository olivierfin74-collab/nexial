'use client'

import { useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'

// Feuille de confirmation "plan d'entrée échelonné" → crée des brouillons
// d'ordre (status=draft) via /api/orders/draft → nx.fn_create_order_draft.
// JAMAIS de soumission broker. Tout est éditable avant création.

export interface OrderDraftCandidate {
  ticker?: string
  name?: string
  asset_id?: string
  currency?: string
  price?: number
  suggested_amount_eur?: number
  suggested_account_id?: string
  suggested_account_label?: string
  composite_score?: number
}

interface OrderDraftSheetProps {
  candidate: OrderDraftCandidate
  /** Taux EUR → devise de l'actif (1 si EUR ou FX indisponible). */
  fxRate: number
}

interface TrancheRow {
  quantity: string
  limitPrice: string
}

const TRANCHE_OFFSETS = [0, -0.03, -0.06] // prix, -3 %, -6 %

function round(value: number, digits: number): number {
  const f = 10 ** digits
  return Math.round(value * f) / f
}

function buildDefaultTranches(
  price: number | undefined,
  amountEur: number | undefined,
  fxRate: number,
): TrancheRow[] {
  if (!price || price <= 0 || !amountEur || amountEur <= 0) {
    return [{ quantity: '', limitPrice: price ? String(round(price, 2)) : '' }]
  }
  const rate = fxRate > 0 ? fxRate : 1
  const amountAsset = amountEur * rate
  const cashPerTranche = amountAsset / TRANCHE_OFFSETS.length
  return TRANCHE_OFFSETS.map((offset) => {
    const limit = round(price * (1 + offset), 2)
    const qty = limit > 0 ? round(cashPerTranche / limit, 4) : 0
    return { quantity: String(qty), limitPrice: String(limit) }
  })
}

function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
  }
}

export function OrderDraftSheet({ candidate, fxRate }: OrderDraftSheetProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState<string | null>(null)
  const [orderCount, setOrderCount] = useState(0)

  const currency = candidate.currency ?? 'EUR'
  const rate = fxRate > 0 ? fxRate : 1

  const [tranches, setTranches] = useState<TrancheRow[]>(() =>
    buildDefaultTranches(candidate.price, candidate.suggested_amount_eur, rate),
  )

  const canSubmit = Boolean(candidate.asset_id && candidate.suggested_account_id)

  const totals = useMemo(() => {
    let asset = 0
    let valid = 0
    for (const row of tranches) {
      const qty = Number(row.quantity)
      const limit = Number(row.limitPrice)
      if (Number.isFinite(qty) && qty > 0) {
        valid += 1
        if (Number.isFinite(limit) && limit > 0) asset += qty * limit
      }
    }
    return { asset, eur: asset / rate, valid }
  }, [tranches, rate])

  function updateRow(index: number, field: keyof TrancheRow, value: string) {
    setTranches((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    )
  }

  function addRow() {
    setTranches((rows) => [...rows, { quantity: '', limitPrice: '' }])
  }

  function removeRow(index: number) {
    setTranches((rows) => (rows.length > 1 ? rows.filter((_, i) => i !== index) : rows))
  }

  async function submit() {
    if (!canSubmit) return
    setStatus('submitting')
    setMessage(null)
    try {
      const payloadTranches = tranches
        .map((row) => ({
          quantity: Number(row.quantity),
          limit_price: row.limitPrice.trim() === '' ? null : Number(row.limitPrice),
        }))
        .filter((t) => Number.isFinite(t.quantity) && t.quantity > 0)

      const res = await fetch('/api/orders/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: candidate.asset_id,
          accountId: candidate.suggested_account_id,
          side: 'buy',
          currency,
          tranches: payloadTranches,
          sourceScore: candidate.composite_score ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json?.error ?? 'Échec de création')
      }
      const result = json?.result ?? {}
      setOrderCount(typeof result.count === 'number' ? result.count : payloadTranches.length)
      setMessage(
        typeof result.note === 'string'
          ? result.note
          : 'Brouillons créés. Visibles dans l’onglet Ordres.',
      )
      setStatus('done')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Erreur inconnue')
      setStatus('error')
    }
  }

  function close() {
    setOpen(false)
    // Réinitialise pour une éventuelle réouverture propre.
    if (status === 'done') {
      setStatus('idle')
      setMessage(null)
      setTranches(buildDefaultTranches(candidate.price, candidate.suggested_amount_eur, rate))
    }
  }

  return (
    <>
      <button type="button" style={triggerCta} onClick={() => setOpen(true)}>
        Voir le plan d&apos;entrée
      </button>

      {open ? (
        <div style={overlay} role="dialog" aria-modal="true" aria-label="Plan d'entrée">
          <div style={backdrop} onClick={close} aria-hidden />
          <div style={sheet}>
            <div style={handle} aria-hidden />

            <header style={sheetHeader}>
              <div style={{ minWidth: 0 }}>
                <h2 style={sheetTitle}>Plan d&apos;entrée échelonné</h2>
                <p style={sheetSub}>
                  {[candidate.ticker, candidate.name].filter(Boolean).join(' · ')}
                </p>
              </div>
              <button type="button" style={closeBtn} onClick={close} aria-label="Fermer">
                ✕
              </button>
            </header>

            <p style={contextLine}>
              {[
                candidate.suggested_account_label,
                'Achat',
                currency,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>

            {status === 'done' ? (
              <div style={doneBox}>
                <p style={doneTitle}>
                  {orderCount > 1
                    ? `${orderCount} brouillons créés`
                    : `${orderCount} brouillon créé`}
                </p>
                {message ? <p style={doneMsg}>{message}</p> : null}
                <Link href="/orders" style={triggerCta} onClick={close}>
                  Voir dans Ordres
                </Link>
              </div>
            ) : (
              <>
                {!canSubmit ? (
                  <p style={warnBox}>
                    Données incomplètes (actif ou compte manquant) — création
                    indisponible pour cette opportunité.
                  </p>
                ) : null}

                <div style={tranchesWrap}>
                  {tranches.map((row, index) => (
                    <div key={index} style={trancheCard}>
                      <div style={trancheHead}>
                        <span style={trancheLabel}>Tranche {index + 1}</span>
                        {tranches.length > 1 ? (
                          <button
                            type="button"
                            style={removeBtn}
                            onClick={() => removeRow(index)}
                            aria-label={`Supprimer la tranche ${index + 1}`}
                          >
                            Retirer
                          </button>
                        ) : null}
                      </div>
                      <div style={fieldGrid}>
                        <label style={fieldLabel}>
                          Quantité
                          <input
                            style={input}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => updateRow(index, 'quantity', e.target.value)}
                          />
                        </label>
                        <label style={fieldLabel}>
                          Prix limite ({currency})
                          <input
                            style={input}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={row.limitPrice}
                            onChange={(e) => updateRow(index, 'limitPrice', e.target.value)}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>

                <button type="button" style={addBtn} onClick={addRow}>
                  + Ajouter une tranche
                </button>

                <div style={summaryRow}>
                  <span style={summaryLabel}>
                    Total {totals.valid > 0 ? `(${totals.valid} tranche${totals.valid > 1 ? 's' : ''})` : ''}
                  </span>
                  <span style={summaryValue}>
                    {formatMoney(totals.asset, currency)}
                    {currency !== 'EUR'
                      ? `  ≈ ${formatMoney(totals.eur, 'EUR')}`
                      : ''}
                  </span>
                </div>

                <p style={noBrokerNote}>
                  Brouillons uniquement — aucune soumission au broker. À valider et
                  soumettre manuellement dans Ordres.
                </p>

                {status === 'error' && message ? (
                  <p style={errorLine}>{message}</p>
                ) : null}

                <div style={actions}>
                  <button type="button" style={cancelBtn} onClick={close}>
                    Annuler
                  </button>
                  <button
                    type="button"
                    style={{
                      ...confirmBtn,
                      opacity: canSubmit && totals.valid > 0 && status !== 'submitting' ? 1 : 0.5,
                    }}
                    onClick={submit}
                    disabled={!canSubmit || totals.valid === 0 || status === 'submitting'}
                  >
                    {status === 'submitting'
                      ? 'Création…'
                      : totals.valid > 1
                        ? `Créer ${totals.valid} brouillons`
                        : 'Créer le brouillon'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  )
}

// --- styles --------------------------------------------------------------

const triggerCta: CSSProperties = {
  minHeight: 44,
  marginTop: 4,
  borderRadius: 8,
  background: 'var(--forest-deep)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0 16px',
  textDecoration: 'none',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 700,
  alignSelf: 'flex-start',
  border: 'none',
  cursor: 'pointer',
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
}

const backdrop: CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(20, 20, 20, 0.45)',
}

const sheet: CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: 560,
  maxHeight: '90vh',
  overflowY: 'auto',
  background: 'var(--surface)',
  borderRadius: '16px 16px 0 0',
  padding: '10px 16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
  boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.18)',
}

const handle: CSSProperties = {
  width: 36,
  height: 4,
  borderRadius: 999,
  background: 'var(--border-subtle)',
  alignSelf: 'center',
  margin: '2px 0 4px',
}

const sheetHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
}

const sheetTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 20,
  fontWeight: 500,
  color: 'var(--ink-primary)',
}

const sheetSub: CSSProperties = {
  margin: '2px 0 0',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  color: 'var(--ink-secondary)',
}

const closeBtn: CSSProperties = {
  flexShrink: 0,
  width: 32,
  height: 32,
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface)',
  color: 'var(--ink-secondary)',
  fontSize: 14,
  cursor: 'pointer',
}

const contextLine: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11.5,
  color: 'var(--forest-deep)',
  letterSpacing: '0.03em',
}

const tranchesWrap: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const trancheCard: CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const trancheHead: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}

const trancheLabel: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--ink-tertiary)',
}

const removeBtn: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: 'var(--burgundy)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  cursor: 'pointer',
  padding: 0,
}

const fieldGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 10,
}

const fieldLabel: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11.5,
  color: 'var(--ink-secondary)',
}

const input: CSSProperties = {
  minHeight: 40,
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface)',
  padding: '0 10px',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 14,
  color: 'var(--ink-primary)',
}

const addBtn: CSSProperties = {
  alignSelf: 'flex-start',
  border: '1px dashed var(--border-subtle)',
  background: 'transparent',
  borderRadius: 8,
  padding: '8px 12px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12.5,
  fontWeight: 600,
  color: 'var(--ink-secondary)',
  cursor: 'pointer',
}

const summaryRow: CSSProperties = {
  display: 'flex',
  alignItems: 'baseline',
  justifyContent: 'space-between',
  gap: 12,
  paddingTop: 4,
  borderTop: '1px solid var(--border-subtle)',
}

const summaryLabel: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--ink-secondary)',
}

const summaryValue: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 14,
  fontWeight: 700,
  color: 'var(--ink-primary)',
}

const noBrokerNote: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11.5,
  lineHeight: 1.4,
  color: 'var(--ink-tertiary)',
}

const warnBox: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12.5,
  lineHeight: 1.4,
  color: 'var(--burgundy)',
  background: 'rgba(122, 56, 56, 0.07)',
  borderRadius: 8,
  padding: '8px 10px',
}

const errorLine: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  color: 'var(--burgundy)',
  wordBreak: 'break-word',
}

const actions: CSSProperties = {
  display: 'flex',
  gap: 10,
  marginTop: 4,
}

const cancelBtn: CSSProperties = {
  flex: '0 0 auto',
  minHeight: 44,
  borderRadius: 8,
  border: '1px solid var(--border-subtle)',
  background: 'var(--surface)',
  color: 'var(--ink-secondary)',
  padding: '0 16px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

const confirmBtn: CSSProperties = {
  flex: 1,
  minHeight: 44,
  borderRadius: 8,
  border: 'none',
  background: 'var(--forest-deep)',
  color: '#fff',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 14,
  fontWeight: 700,
  cursor: 'pointer',
}

const doneBox: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  padding: '8px 0',
}

const doneTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 18,
  fontWeight: 500,
  color: 'var(--forest-deep)',
}

const doneMsg: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13.5,
  lineHeight: 1.45,
  color: 'var(--ink-secondary)',
}
