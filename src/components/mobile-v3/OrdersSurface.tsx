'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { CheckCircle2, Plus, XCircle } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { useActiveOrders, type ActiveOrder } from '@/lib/hooks/useActiveOrders'

type OrderFilter = 'all' | 'proposed' | 'running' | 'filled' | 'cancelled'
type OrderBucket = Exclude<OrderFilter, 'all'> | 'other'

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'proposed', label: 'Proposes' },
  { key: 'running', label: 'En cours' },
  { key: 'filled', label: 'Executes' },
  { key: 'cancelled', label: 'Annules' },
]

function canonicalBucket(value: string): OrderBucket {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (['proposed', 'proposes', 'draft'].includes(normalized)) return 'proposed'
  if (['running', 'en_cours', 'submitted', 'broker_submitted', 'partially_filled'].includes(normalized)) {
    return 'running'
  }
  if (['filled', 'executes', 'executed'].includes(normalized)) return 'filled'
  if (['cancelled', 'canceled', 'annules', 'expired', 'rejected'].includes(normalized)) {
    return 'cancelled'
  }
  return 'other'
}

function normalStatus(status: string | undefined): string {
  return String(status ?? '').trim().toLowerCase()
}

function bucketFor(order: ActiveOrder): OrderBucket {
  const lifecycle = pickString(
    order.lifecycle_state,
    order.status_bucket,
    order.status_group,
    order.state_group,
  )
  return canonicalBucket(lifecycle)
}

function statusLabel(order: ActiveOrder): string {
  switch (bucketFor(order)) {
    case 'proposed':
      return 'Propose'
    case 'running':
      return normalStatus(order.status) === 'partially_filled' ? 'Partiel' : 'En cours'
    case 'filled':
      return 'Execute'
    case 'cancelled':
      return normalStatus(order.status) === 'expired' ? 'Expire' : 'Annule'
    default:
      return order.status || 'Statut inconnu'
  }
}

function statusStyle(order: ActiveOrder): CSSProperties {
  switch (bucketFor(order)) {
    case 'proposed':
      return {
        color: '#7A4F12',
        background: 'rgba(184,146,74,0.12)',
        borderColor: 'rgba(184,146,74,0.35)',
      }
    case 'running':
      return {
        color: '#174D7A',
        background: 'rgba(50,112,160,0.10)',
        borderColor: 'rgba(50,112,160,0.28)',
      }
    case 'filled':
      return {
        color: 'var(--forest-green)',
        background: 'rgba(45,107,31,0.10)',
        borderColor: 'rgba(45,107,31,0.28)',
      }
    case 'cancelled':
      return {
        color: '#8B2C28',
        background: 'rgba(168,48,44,0.09)',
        borderColor: 'rgba(168,48,44,0.25)',
      }
    default:
      return {
        color: 'var(--ink-tertiary)',
        background: 'rgba(0,0,0,0.03)',
        borderColor: 'var(--border-subtle)',
      }
  }
}

function pickNumber(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

function formatMoney(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return '-'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency || 'EUR'}`
  }
}

function formatQty(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '-'
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 4 }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function sideLabel(side: string | undefined): string {
  return String(side ?? '').toLowerCase() === 'sell' ? 'SELL' : 'BUY'
}

function sourceLabel(order: ActiveOrder): string {
  const source = pickString(order.source, order.order_source, order.origin)
  if (!source) return 'Nexial'
  const normalized = source.toLowerCase()
  if (normalized.includes('ibkr')) return 'IBKR'
  if (normalized.includes('manual') || normalized.includes('manuel')) return 'manuel'
  return 'Nexial'
}

function accountLabel(order: ActiveOrder): string {
  const raw = pickString(order.account_kind, order.account_name, order.account_scope)
  const lower = raw.toLowerCase()
  if (lower.includes('pea')) return 'PEA'
  if (lower.includes('cto') || lower.includes('ibkr')) return 'CTO'
  return raw || '-'
}

function assetName(order: ActiveOrder): string {
  return pickString(order.asset_name, order.asset_name_fr, order.name, order.ticker)
}

function orderPrice(order: ActiveOrder): number | null {
  return pickNumber(order.limit_price, order.effective_price, order.price)
}

function orderQuantity(order: ActiveOrder): number | null {
  return pickNumber(order.quantity, order.effective_quantity)
}

function filledQuantity(order: ActiveOrder): number | null {
  return pickNumber(order.filled_quantity, order.filled_qty)
}

function remainingQuantity(order: ActiveOrder): number | null {
  const explicit = pickNumber(order.remaining_quantity, order.remaining_qty)
  if (explicit != null) return explicit
  const qty = orderQuantity(order)
  const filled = filledQuantity(order)
  if (qty == null || filled == null) return null
  return Math.max(qty - filled, 0)
}

function estimatedAmount(order: ActiveOrder): number | null {
  const explicit = pickNumber(order.amount_estimated, order.estimated_amount, order.effective_amount)
  if (explicit != null) return explicit
  const qty = orderQuantity(order)
  const price = orderPrice(order)
  if (qty == null || price == null) return null
  return qty * price
}

interface OrderCardProps {
  order: ActiveOrder
  markingId: string | null
  onMarkSubmitted: (order: ActiveOrder) => Promise<void>
  onMarkCancelled: (order: ActiveOrder) => Promise<void>
}

function OrderCard({ order, markingId, onMarkSubmitted, onMarkCancelled }: OrderCardProps) {
  const currency = pickString(order.currency) || 'EUR'
  const price = orderPrice(order)
  const qty = orderQuantity(order)
  const filled = filledQuantity(order)
  const remaining = remainingQuantity(order)
  const amount = estimatedAmount(order)
  const isProposed = bucketFor(order) === 'proposed'
  const canCancel = ['proposed', 'running'].includes(bucketFor(order))
  const disabled = markingId === order.id

  return (
    <article data-order-id={order.id} data-status={order.status} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={tickerStyle}>{order.ticker || '-'}</span>
            <span style={sidePill}>{sideLabel(order.side)}</span>
          </div>
          <p style={assetStyle}>{assetName(order)}</p>
        </div>
        <span style={{ ...statusPill, ...statusStyle(order) }}>{statusLabel(order)}</span>
      </div>

      <div style={gridStyle}>
        <Metric label="Quantite" value={formatQty(qty)} />
        <Metric label="Prix limite" value={formatMoney(price, currency)} />
        <Metric label="Devise" value={currency} />
        <Metric label="Montant" value={formatMoney(amount, currency)} />
        <Metric label="Compte" value={accountLabel(order)} />
        <Metric label="Source" value={sourceLabel(order)} />
      </div>

      <div style={metaLine}>
        <span>{formatDate(order.submitted_at || order.filled_at || order.created_at || order.signal_at_creation)}</span>
        {filled != null || remaining != null ? (
          <span>
            rempli {formatQty(filled)} / restant {formatQty(remaining)}
          </span>
        ) : null}
      </div>

      {isProposed || canCancel ? (
        <div style={{ display: 'grid', gridTemplateColumns: isProposed ? '1fr 1fr' : '1fr', gap: 8 }}>
          {isProposed ? (
            <button
              type="button"
              onClick={() => onMarkSubmitted(order)}
              disabled={disabled}
              style={{
                ...actionButton,
                opacity: disabled ? 0.65 : 1,
                cursor: disabled ? 'wait' : 'pointer',
              }}
            >
              <CheckCircle2 size={16} aria-hidden />
              {disabled ? 'Mise a jour...' : "J'ai place l'ordre"}
            </button>
          ) : null}
          {canCancel ? (
            <button
              type="button"
              onClick={() => onMarkCancelled(order)}
              disabled={disabled}
              style={{
                ...secondaryButton,
                opacity: disabled ? 0.65 : 1,
                cursor: disabled ? 'wait' : 'pointer',
              }}
            >
              <XCircle size={16} aria-hidden />
              Ordre annule
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={metricLabel}>{label}</div>
      <div style={metricValue}>{value}</div>
    </div>
  )
}

export function OrdersSurface() {
  const { orders, loading, error, refetch } = useActiveOrders({ pollMs: 30000 })
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const counts = useMemo(() => {
    const base: Record<OrderFilter, number> = {
      all: orders.length,
      proposed: 0,
      running: 0,
      filled: 0,
      cancelled: 0,
    }
    for (const order of orders) {
      const bucket = bucketFor(order)
      if (bucket !== 'other') base[bucket] += 1
    }
    return base
  }, [orders])

  const visibleOrders = useMemo(() => {
    if (filter === 'all') return orders
    return orders.filter((order) => bucketFor(order) === filter)
  }, [filter, orders])

  const contextLine = loading && !orders.length
    ? 'Chargement...'
    : `${counts.proposed} proposes - ${counts.running} en cours - ${counts.filled} executes`

  async function markSubmitted(order: ActiveOrder) {
    setMarkingId(order.id)
    setActionError(null)
    try {
      const res = await fetch('/api/orders/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'placed', orderId: order.id, brokerRef: null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      await refetch()
      setFilter('running')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Mise a jour impossible')
    } finally {
      setMarkingId(null)
    }
  }

  async function markCancelled(order: ActiveOrder) {
    const reason = window.prompt("Raison d'annulation (optionnel)") || null
    setMarkingId(order.id)
    setActionError(null)
    try {
      const res = await fetch('/api/orders/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelled', orderId: order.id, reason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      await refetch()
      setFilter('cancelled')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Mise a jour impossible')
    } finally {
      setMarkingId(null)
    }
  }

  async function createManualOrder() {
    const raw = window.prompt('Arguments JSON pour fn_create_manual_order')
    if (!raw) return
    setActionError(null)
    try {
      const payload = JSON.parse(raw) as Record<string, unknown>
      const res = await fetch('/api/orders/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      await refetch()
      setFilter('all')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Creation impossible')
    }
  }

  return (
    <AppShell>
      <MobileTopHeader eyebrow="Execution" title="Ordres" contextLine={contextLine} compact />

      <main style={surfaceStyle}>
        <button type="button" onClick={createManualOrder} style={manualButton}>
          <Plus size={16} aria-hidden />
          Nouvel ordre manuel
        </button>

        <div role="tablist" aria-label="Filtrer les ordres" style={filtersStyle}>
          {FILTERS.map((item) => {
            const active = item.key === filter
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.key)}
                style={{
                  ...filterChip,
                  ...(active ? filterChipActive : null),
                }}
              >
                <span>{item.label}</span>
                <span style={countStyle}>{counts[item.key]}</span>
              </button>
            )
          })}
        </div>

        {error || actionError ? (
          <section role="status" style={noticeStyle}>
            {actionError || "Certaines donnees n'ont pas pu etre mises a jour."}
          </section>
        ) : null}

        {loading && !orders.length ? (
          <section aria-busy="true" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={skeletonStyle} />
            ))}
          </section>
        ) : visibleOrders.length ? (
          <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {visibleOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                markingId={markingId}
                onMarkSubmitted={markSubmitted}
                onMarkCancelled={markCancelled}
              />
            ))}
          </section>
        ) : (
          <section style={emptyStyle}>Aucun ordre dans ce filtre.</section>
        )}
      </main>
    </AppShell>
  )
}

const surfaceStyle: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '0 16px 20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const filtersStyle: CSSProperties = {
  display: 'flex',
  gap: 8,
  overflowX: 'auto',
  padding: '2px 0 4px',
  scrollbarWidth: 'none',
}

const filterChip: CSSProperties = {
  flex: '0 0 auto',
  minHeight: 34,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  border: '1px solid var(--border-subtle)',
  borderRadius: 999,
  background: 'var(--surface)',
  color: 'var(--ink-secondary)',
  padding: '7px 11px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  fontWeight: 650,
}

const filterChipActive: CSSProperties = {
  background: 'var(--forest-deep)',
  borderColor: 'var(--forest-deep)',
  color: '#FFFFFF',
}

const countStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  opacity: 0.76,
}

const cardStyle: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const tickerStyle: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 16,
  fontWeight: 750,
  letterSpacing: '0.04em',
  color: 'var(--ink-primary)',
  textTransform: 'uppercase',
}

const assetStyle: CSSProperties = {
  margin: '3px 0 0',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-secondary)',
  lineHeight: 1.3,
}

const sidePill: CSSProperties = {
  border: '1px solid rgba(45,107,31,0.25)',
  borderRadius: 999,
  padding: '2px 7px',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--forest-green)',
}

const statusPill: CSSProperties = {
  alignSelf: 'flex-start',
  border: '1px solid',
  borderRadius: 999,
  padding: '4px 8px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11,
  fontWeight: 700,
  whiteSpace: 'nowrap',
}

const gridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px 12px',
}

const metricLabel: CSSProperties = {
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 9,
  fontWeight: 700,
  color: 'var(--ink-tertiary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 3,
}

const metricValue: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 12,
  color: 'var(--ink-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const metaLine: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  flexWrap: 'wrap',
  borderTop: '1px solid var(--border-subtle)',
  paddingTop: 10,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-tertiary)',
}

const actionButton: CSSProperties = {
  minHeight: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid var(--forest-deep)',
  borderRadius: 8,
  background: 'var(--forest-deep)',
  color: '#FFFFFF',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
}

const secondaryButton: CSSProperties = {
  minHeight: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid rgba(168,48,44,0.28)',
  borderRadius: 8,
  background: 'rgba(168,48,44,0.07)',
  color: '#8B2C28',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
}

const manualButton: CSSProperties = {
  minHeight: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--ink-primary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
}

const noticeStyle: CSSProperties = {
  border: '1px solid rgba(168,48,44,0.25)',
  borderRadius: 8,
  background: 'rgba(168,48,44,0.07)',
  padding: 12,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: '#8B2C28',
}

const emptyStyle: CSSProperties = {
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--surface)',
  padding: 14,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--ink-tertiary)',
}

const skeletonStyle: CSSProperties = {
  height: 148,
  borderRadius: 8,
  background: 'rgba(0,0,0,0.04)',
  border: '1px solid var(--border-subtle)',
}
