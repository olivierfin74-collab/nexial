'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { CheckCircle2, Plus, XCircle } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { useActiveOrders, type ActiveOrder } from '@/lib/hooks/useActiveOrders'

type OrderFilter = 'all' | 'proposed' | 'running' | 'filled' | 'cancelled'
type OrderBucket = Exclude<OrderFilter, 'all'> | 'other'
type AccountKey = 'PEA' | 'CTO'
type OrderSide = 'buy' | 'sell'
type InitialOrderStatus = 'proposed' | 'placed'

const ACCOUNTS: Record<AccountKey, { id: string; label: string }> = {
  PEA: { id: '019df844-2150-713b-8e57-ef62fc768767', label: 'PEA' },
  CTO: { id: '019df844-2163-7315-be76-1cb886c8e7bd', label: 'CTO' },
}

const EMPTY_CREATE_FORM = {
  ticker: '',
  account: 'PEA' as AccountKey,
  side: 'buy' as OrderSide,
  quantity: '',
  limitPrice: '',
  orderType: 'limit',
  currency: '',
  initialStatus: 'placed' as InitialOrderStatus,
}

const EMPTY_FILL_FORM = {
  fillPrice: '',
  fillQuantity: '',
  fees: '0',
}

const FILTERS: Array<{ key: OrderFilter; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'proposed', label: 'Proposés' },
  { key: 'running', label: 'En cours' },
  { key: 'filled', label: 'Exécutés' },
  { key: 'cancelled', label: 'Annulés' },
]

function canonicalBucket(value: string): OrderBucket {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')

  if (['draft', 'propose'].includes(normalized)) return 'proposed'
  if (['submitted', 'partially_filled', 'en_cours'].includes(normalized)) return 'running'
  if (['filled', 'execute'].includes(normalized)) return 'filled'
  if (['cancelled', 'expired', 'rejected', 'annule'].includes(normalized)) return 'cancelled'
  return 'other'
}

function bucketFor(order: ActiveOrder): OrderBucket {
  return canonicalBucket(order.status || order.status_fr)
}

function statusLabel(order: ActiveOrder): string {
  return order.status_fr || order.status || 'Statut inconnu'
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

function formatMoney(value: number | null, currency: string): string {
  if (value == null || !Number.isFinite(value)) return '-'
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency}`
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
  return String(side ?? '').toLowerCase() === 'sell' ? 'Vendre' : 'Acheter'
}

function parseNumberInput(value: string): number | null {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function successMessage(payload: unknown, fallback: string): string {
  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    const message = record.message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

function filledErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const record = payload as Record<string, unknown>
  const message = typeof record.message === 'string' ? record.message : null
  const status = typeof record.status === 'string' ? record.status : null

  if (status === 'oversell_blocked') {
    const held = record.held_quantity
    const suffix = typeof held === 'number' || typeof held === 'string' ? ` (${held})` : ''
    return message || `Vente supérieure à la quantité détenue${suffix}`
  }

  if (status === 'invalid_state') {
    const current = record.current_status
    const suffix = typeof current === 'string' && current ? ` : ${current}` : ''
    return message || `Ordre déjà dans un état non marquable${suffix}`
  }

  if (status === 'order_not_found') return message || 'Ordre introuvable'
  return message || fallback
}

interface OrderCardProps {
  order: ActiveOrder
  markingId: string | null
  fillOrderId: string | null
  fillForm: typeof EMPTY_FILL_FORM
  fillError: string | null
  onFillFormChange: (form: typeof EMPTY_FILL_FORM) => void
  onOpenFillForm: (order: ActiveOrder) => void
  onCancelFillForm: () => void
  onConfirmFilled: (order: ActiveOrder) => Promise<void>
  onMarkSubmitted: (order: ActiveOrder) => Promise<void>
  onMarkCancelled: (order: ActiveOrder) => Promise<void>
}

function OrderCard({
  order,
  markingId,
  fillOrderId,
  fillForm,
  fillError,
  onFillFormChange,
  onOpenFillForm,
  onCancelFillForm,
  onConfirmFilled,
  onMarkSubmitted,
  onMarkCancelled,
}: OrderCardProps) {
  const currency = order.currency
  const amount = order.estimated_value_native
  const isProposed = bucketFor(order) === 'proposed'
  const isRunning = bucketFor(order) === 'running'
  const canCancel = ['proposed', 'running'].includes(bucketFor(order))
  const disabled = markingId === order.id
  const fillOpen = fillOrderId === order.id

  return (
    <article data-order-id={order.id} data-status={order.status} style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={tickerStyle}>{order.ticker || '-'}</span>
            <span style={sidePill}>{sideLabel(order.side)}</span>
          </div>
          <p style={assetStyle}>{order.asset_name}</p>
        </div>
        <span style={{ ...statusPill, ...statusStyle(order) }}>{statusLabel(order)}</span>
      </div>

      <div style={gridStyle}>
        <Metric label="Quantite" value={formatQty(order.quantity)} />
        <Metric label="Prix limite" value={formatMoney(order.limit_price, currency)} />
        <Metric label="Devise" value={currency} />
        <Metric label="Montant" value={formatMoney(amount, currency)} />
        <Metric label="Compte" value={order.account_type} />
        <Metric label="Source" value={order.source} />
      </div>

      <div style={metaLine}>
        <span>{formatDate(order.submitted_at || order.filled_at || order.created_at)}</span>
        {order.filled_quantity != null || order.remaining_quantity != null ? (
          <span>
            rempli {formatQty(order.filled_quantity)} / restant {formatQty(order.remaining_quantity)}
          </span>
        ) : null}
      </div>

      {isProposed || isRunning || canCancel ? (
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
              {disabled ? 'Mise à jour...' : "J'ai placé l'ordre"}
            </button>
          ) : null}
          {isRunning ? (
            <button
              type="button"
              onClick={() => onOpenFillForm(order)}
              disabled={disabled}
              style={{
                ...actionButton,
                opacity: disabled ? 0.65 : 1,
                cursor: disabled ? 'wait' : 'pointer',
              }}
            >
              <CheckCircle2 size={16} aria-hidden />
              Marquer exécuté
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
              Ordre annulé sur broker lié
            </button>
          ) : null}
        </div>
      ) : null}

      {fillOpen ? (
        <FillOrderForm
          disabled={disabled}
          error={fillError}
          form={fillForm}
          onCancel={onCancelFillForm}
          onChange={onFillFormChange}
          onSubmit={() => onConfirmFilled(order)}
        />
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

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={fieldLabel}>{children}</label>
}

function CreateOrderForm({
  disabled,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  disabled: boolean
  form: typeof EMPTY_CREATE_FORM
  onCancel: () => void
  onChange: (form: typeof EMPTY_CREATE_FORM) => void
  onSubmit: () => void
}) {
  return (
    <form
      style={formPanel}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div style={formHeader}>
        <h2 style={formTitle}>Nouvel ordre manuel</h2>
        <button type="button" onClick={onCancel} disabled={disabled} style={ghostButton}>
          Annuler
        </button>
      </div>

      <div style={formGrid}>
        <FieldLabel>
          Ticker
          <input
            required
            value={form.ticker}
            onChange={(event) => onChange({ ...form, ticker: event.target.value.toUpperCase() })}
            placeholder="TTE"
            style={inputStyle}
          />
        </FieldLabel>

        <FieldLabel>
          Compte
          <select
            value={form.account}
            onChange={(event) => onChange({ ...form, account: event.target.value as AccountKey })}
            style={inputStyle}
          >
            <option value="PEA">PEA</option>
            <option value="CTO">CTO</option>
          </select>
        </FieldLabel>

        <FieldLabel>
          Sens
          <select
            value={form.side}
            onChange={(event) => onChange({ ...form, side: event.target.value as OrderSide })}
            style={inputStyle}
          >
            <option value="buy">Acheter</option>
            <option value="sell">Vendre</option>
          </select>
        </FieldLabel>

        <FieldLabel>
          Quantité
          <input
            required
            inputMode="decimal"
            value={form.quantity}
            onChange={(event) => onChange({ ...form, quantity: event.target.value })}
            style={inputStyle}
          />
        </FieldLabel>

        <FieldLabel>
          Prix limite
          <input
            inputMode="decimal"
            value={form.limitPrice}
            onChange={(event) => onChange({ ...form, limitPrice: event.target.value })}
            style={inputStyle}
          />
        </FieldLabel>

        <FieldLabel>
          Type
          <select
            value={form.orderType}
            onChange={(event) => onChange({ ...form, orderType: event.target.value })}
            style={inputStyle}
          >
            <option value="limit">Limit</option>
            <option value="market">Market</option>
          </select>
        </FieldLabel>

        <FieldLabel>
          Devise
          <input
            value={form.currency}
            onChange={(event) => onChange({ ...form, currency: event.target.value.toUpperCase() })}
            placeholder="auto"
            style={inputStyle}
          />
        </FieldLabel>

        <FieldLabel>
          Statut initial
          <select
            value={form.initialStatus}
            onChange={(event) => onChange({ ...form, initialStatus: event.target.value as InitialOrderStatus })}
            style={inputStyle}
          >
            <option value="proposed">Proposé</option>
            <option value="placed">Déjà placé chez le broker</option>
          </select>
        </FieldLabel>
      </div>

      <div style={formActions}>
        <button type="button" onClick={onCancel} disabled={disabled} style={cancelButton}>
          Annuler
        </button>
        <button type="submit" disabled={disabled} style={{ ...actionButton, opacity: disabled ? 0.65 : 1 }}>
          {disabled ? 'Création...' : "Créer l'ordre"}
        </button>
      </div>
    </form>
  )
}

function FillOrderForm({
  disabled,
  error,
  form,
  onCancel,
  onChange,
  onSubmit,
}: {
  disabled: boolean
  error: string | null
  form: typeof EMPTY_FILL_FORM
  onCancel: () => void
  onChange: (form: typeof EMPTY_FILL_FORM) => void
  onSubmit: () => void
}) {
  return (
    <form
      style={inlineFormPanel}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div style={formGrid}>
        <FieldLabel>
          Prix exécuté
          <input
            required
            inputMode="decimal"
            value={form.fillPrice}
            onChange={(event) => onChange({ ...form, fillPrice: event.target.value })}
            style={inputStyle}
          />
        </FieldLabel>
        <FieldLabel>
          Quantité exécutée
          <input
            required
            inputMode="decimal"
            value={form.fillQuantity}
            onChange={(event) => onChange({ ...form, fillQuantity: event.target.value })}
            style={inputStyle}
          />
        </FieldLabel>
        <FieldLabel>
          Frais
          <input
            inputMode="decimal"
            value={form.fees}
            onChange={(event) => onChange({ ...form, fees: event.target.value })}
            style={inputStyle}
          />
        </FieldLabel>
      </div>

      {error ? <div style={inlineError}>{error}</div> : null}

      <div style={formActions}>
        <button type="button" onClick={onCancel} disabled={disabled} style={cancelButton}>
          Annuler
        </button>
        <button type="submit" disabled={disabled} style={{ ...actionButton, opacity: disabled ? 0.65 : 1 }}>
          {disabled ? 'Confirmation...' : 'Confirmer'}
        </button>
      </div>
    </form>
  )
}

export function OrdersSurface() {
  const { orders, loading, error, refetch } = useActiveOrders({ pollMs: 30000 })
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM)
  const [fillOrderId, setFillOrderId] = useState<string | null>(null)
  const [fillForm, setFillForm] = useState(EMPTY_FILL_FORM)
  const [fillError, setFillError] = useState<string | null>(null)

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
    : `${counts.proposed} proposés - ${counts.running} en cours - ${counts.filled} exécutés`

  function resetCreateForm() {
    setCreateOpen(false)
    setCreateForm(EMPTY_CREATE_FORM)
  }

  function resetFillForm() {
    setFillOrderId(null)
    setFillForm(EMPTY_FILL_FORM)
    setFillError(null)
  }

  async function markSubmitted(order: ActiveOrder) {
    setMarkingId(order.id)
    setActionError(null)
    setActionMessage(null)
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
      setActionError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setMarkingId(null)
    }
  }

  async function markCancelled(order: ActiveOrder) {
    setMarkingId(order.id)
    setActionError(null)
    setActionMessage(null)
    try {
      const res = await fetch('/api/orders/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancelled', orderId: order.id, reason: null }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      await refetch()
      setFilter('cancelled')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Mise à jour impossible')
    } finally {
      setMarkingId(null)
    }
  }

  async function createManualOrder() {
    const quantity = parseNumberInput(createForm.quantity)
    const limitPrice = parseNumberInput(createForm.limitPrice)
    if (!createForm.ticker.trim() || quantity == null) {
      setActionError('Ticker et quantité sont obligatoires.')
      return
    }

    setActionError(null)
    setActionMessage(null)
    setMarkingId('create')
    try {
      const res = await fetch('/api/orders/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: ACCOUNTS[createForm.account].id,
          ticker: createForm.ticker.trim().toUpperCase(),
          side: createForm.side,
          quantity,
          limitPrice,
          orderType: createForm.orderType,
          currency: createForm.currency.trim() || null,
          alreadyPlaced: createForm.initialStatus === 'placed',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      await refetch()
      setActionMessage(successMessage(json.order, 'Ordre créé.'))
      setFilter(createForm.initialStatus === 'placed' ? 'running' : 'proposed')
      resetCreateForm()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setMarkingId(null)
    }
  }

  async function confirmFilled(order: ActiveOrder) {
    const fillPrice = parseNumberInput(fillForm.fillPrice)
    const fillQuantity = parseNumberInput(fillForm.fillQuantity)
    const fees = parseNumberInput(fillForm.fees) ?? 0

    if (fillPrice == null || fillQuantity == null) {
      setFillError('Prix exécuté et quantité exécutée sont obligatoires.')
      return
    }

    setMarkingId(order.id)
    setActionError(null)
    setActionMessage(null)
    setFillError(null)
    try {
      const res = await fetch('/api/orders/active', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'filled',
          orderId: order.id,
          fillPrice,
          fillQuantity,
          fees,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
      const payload = json.order ?? json
      if (payload && typeof payload === 'object') {
        const status = (payload as Record<string, unknown>).status
        if (status && status !== 'ok') {
          throw new Error(filledErrorMessage(payload, 'Exécution refusée.'))
        }
      }
      await refetch()
      setActionMessage(successMessage(payload, 'Ordre marqué exécuté.'))
      setFilter('filled')
      resetFillForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Exécution impossible'
      setFillError(message)
      setActionError(message)
    } finally {
      setMarkingId(null)
    }
  }

  return (
    <AppShell>
      <MobileTopHeader eyebrow="Execution" title="Ordres" contextLine={contextLine} compact />

      <main style={surfaceStyle}>
        <button
          type="button"
          onClick={() => {
            setCreateOpen(true)
            setActionError(null)
            setActionMessage(null)
          }}
          style={manualButton}
        >
          <Plus size={16} aria-hidden />
          Nouvel ordre manuel
        </button>

        {createOpen ? (
          <CreateOrderForm
            disabled={markingId === 'create'}
            form={createForm}
            onCancel={resetCreateForm}
            onChange={setCreateForm}
            onSubmit={createManualOrder}
          />
        ) : null}

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

        {actionMessage ? (
          <section role="status" style={successNoticeStyle}>
            {actionMessage}
          </section>
        ) : null}

        {error || actionError ? (
          <section role="status" style={noticeStyle}>
            {actionError || "Certaines données n'ont pas pu être mises à jour."}
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
                fillOrderId={fillOrderId}
                fillForm={fillForm}
                fillError={fillOrderId === order.id ? fillError : null}
                onFillFormChange={setFillForm}
                onOpenFillForm={(currentOrder) => {
                  setFillOrderId(currentOrder.id)
                  setFillForm({
                    fillPrice: currentOrder.limit_price == null ? '' : String(currentOrder.limit_price),
                    fillQuantity: currentOrder.remaining_quantity == null
                      ? String(currentOrder.quantity ?? '')
                      : String(currentOrder.remaining_quantity),
                    fees: '0',
                  })
                  setFillError(null)
                  setActionError(null)
                  setActionMessage(null)
                }}
                onCancelFillForm={resetFillForm}
                onConfirmFilled={confirmFilled}
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

const successNoticeStyle: CSSProperties = {
  border: '1px solid rgba(45,107,31,0.25)',
  borderRadius: 8,
  background: 'rgba(45,107,31,0.08)',
  padding: 12,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  color: 'var(--forest-green)',
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

const formPanel: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: 14,
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
}

const inlineFormPanel: CSSProperties = {
  background: 'rgba(0,0,0,0.025)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}

const formHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
}

const formTitle: CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 15,
  fontWeight: 750,
  color: 'var(--ink-primary)',
}

const formGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 10,
}

const fieldLabel: CSSProperties = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--ink-secondary)',
}

const inputStyle: CSSProperties = {
  width: '100%',
  minHeight: 38,
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--canvas)',
  color: 'var(--ink-primary)',
  padding: '8px 10px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  outline: 'none',
}

const formActions: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
}

const ghostButton: CSSProperties = {
  minHeight: 32,
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'transparent',
  color: 'var(--ink-secondary)',
  padding: '6px 10px',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  fontWeight: 700,
}

const cancelButton: CSSProperties = {
  minHeight: 38,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: '1px solid var(--border-subtle)',
  borderRadius: 8,
  background: 'var(--surface)',
  color: 'var(--ink-secondary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 13,
  fontWeight: 700,
}

const inlineError: CSSProperties = {
  border: '1px solid rgba(168,48,44,0.25)',
  borderRadius: 8,
  background: 'rgba(168,48,44,0.07)',
  padding: 9,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: '#8B2C28',
}
