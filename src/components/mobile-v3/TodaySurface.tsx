'use client'

// Aujourd'hui surface — action-led execution view (V1).
//
// Hierarchy (top-down, all CollapsibleSection):
//   - À TRAITER MAINTENANT  decisions urgentes ou plans actifs
//   - À PRÉPARER            approche de zone / stratégie /
//                           hygiène patrimoine sous-bloc
//   - RIEN À FAIRE          surveillance seulement (collapsed
//                           par défaut, lecture rassurante)
//
// Sources réutilisées (aucun nouveau RPC, aucune nouvelle route) :
//   fn_focus_today           → priorities (verdict.color bucket)
//   fn_decisions_to_handle   → top_decisions (tier bucket)
//   fn_todo_list             → items (sous-bloc Hygiène)
//
// CTAs sont remappés côté front (cta.redirect_kind → label Olivier).
// "Je passe" est local-only (state React, non persistant) — limite
// documentée pour V2.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AppShell } from '@/components/shell/AppShell'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import {
  ExitPlanModal,
  LadderBuilderModal,
  ThesisEditorModal,
} from '@/components/ui/decisional'
import type { DispatchModalContext } from '@/types/decision'
import type {
  DecisionsToHandlePayload,
  DecisionToHandleItem,
  FetchEnvelope,
  FocusTodayItem,
  FocusTodayPayload,
  ModalContext,
  RedirectKind,
  TodoItem,
  TodoListPayload,
} from '@/types/nexial-v3'

interface SurfaceState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const initial = <T,>(): SurfaceState<T> => ({ data: null, loading: true, error: null })

async function fetchEnvelope<T>(
  path: string,
  signal?: AbortSignal,
): Promise<SurfaceState<T>> {
  try {
    const res = await fetch(path, { cache: 'no-store', signal })
    const json = (await res.json()) as FetchEnvelope<T>
    if (!res.ok || json.error) {
      return { data: null, loading: false, error: json.error?.code ?? 'fetch_failed' }
    }
    return { data: json.data, loading: false, error: null }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { data: null, loading: true, error: null }
    }
    return {
      data: null,
      loading: false,
      error: err instanceof Error ? err.message : 'fetch_failed',
    }
  }
}

// ─────────────────────────────────────────────────────────
// Verdict color → sober token. Same palette family as the
// Dashboard but kept distinct here in case it diverges later.
// ─────────────────────────────────────────────────────────
function verdictTone(color: string | undefined): string {
  switch (color) {
    case 'green':
      return 'var(--forest-green)'
    case 'yellow':
      return '#8B6914'
    case 'red':
      return 'var(--burgundy)'
    case 'orange':
      return '#8A4B0B'
    case 'blue':
      return '#1F4A6E'
    case 'neutral':
    case 'gray':
    default:
      return 'var(--ink-secondary)'
  }
}

// ─────────────────────────────────────────────────────────
// CTA mapping — Olivier verbs front-side.
// ─────────────────────────────────────────────────────────
function mapCtaLabel(
  kind: RedirectKind | undefined,
  backendLabel: string | undefined,
): string {
  switch (kind) {
    case 'open_ladder_modal':
      return "Activer le plan d’achat"
    case 'open_exit_modal':
      return 'Préparer un ordre'
    case 'open_thesis_modal':
    case 'open_thesis_modal_urgent':
      return 'Définir ma stratégie'
    case 'navigate_to_asset':
      return 'Voir le setup'
    default: {
      const fallback = (backendLabel ?? '').trim()
      return fallback || 'Voir le setup'
    }
  }
}

// ─────────────────────────────────────────────────────────
// Bucket classification — Olivier doctrine.
// ─────────────────────────────────────────────────────────
type Bucket = 'now' | 'prepare' | 'nothing'

function focusBucket(item: FocusTodayItem): Bucket {
  const color = item.verdict?.color
  const kind = item.cta?.redirect_kind
  if (color === 'red') return 'now'
  if (color === 'yellow') {
    if (kind === 'open_ladder_modal' || kind === 'open_exit_modal') return 'now'
    return 'prepare'
  }
  if (color === 'green' || color === 'neutral' || color === 'gray') return 'nothing'
  return 'prepare'
}

function decisionBucket(item: DecisionToHandleItem): Bucket {
  switch (item.tier) {
    case 'CRITIQUE':
    case 'ACTION':
      return 'now'
    case 'SURVEILLANCE':
      return 'prepare'
    case 'INFORMATION':
    default:
      return 'nothing'
  }
}

function decisionColorFromTier(tier: string | undefined): string {
  switch (tier) {
    case 'CRITIQUE':
      return 'red'
    case 'ACTION':
      return 'yellow'
    case 'SURVEILLANCE':
      return 'yellow'
    case 'INFORMATION':
    default:
      return 'neutral'
  }
}

// ─────────────────────────────────────────────────────────
// Normalize both sources into a single shape so we have one
// row component for À TRAITER / À PRÉPARER and one for RIEN À
// FAIRE.
// ─────────────────────────────────────────────────────────
interface ActionItem {
  key: string
  ticker: string
  asset_name_fr: string
  headline_fr: string
  verdict_label_fr: string
  verdict_color: string
  price_display: string | null
  delta_display: string | null
  cta_label: string
  redirect_kind: RedirectKind | undefined
  modal_context: ModalContext | null
  alert_id: string
  asset_id: string
}

function dismissKey(item: { alert_id?: string; asset_id?: string; ticker: string }): string {
  return item.alert_id || item.asset_id || item.ticker
}

function normalizeFocus(item: FocusTodayItem): ActionItem {
  const kind = item.cta?.redirect_kind
  return {
    key: dismissKey(item),
    ticker: item.ticker,
    asset_name_fr: item.asset_name_fr,
    headline_fr: item.headline_fr,
    verdict_label_fr: item.verdict?.label_fr ?? '',
    verdict_color: item.verdict?.color ?? 'neutral',
    price_display:
      typeof item.context_compact?.price_display === 'string'
        ? item.context_compact.price_display
        : null,
    delta_display:
      typeof item.context_compact?.delta_display === 'string'
        ? item.context_compact.delta_display
        : null,
    cta_label: mapCtaLabel(kind, item.cta?.label_fr),
    redirect_kind: kind,
    modal_context: item.cta?.modal_context ?? null,
    alert_id: item.alert_id,
    asset_id: item.asset_id,
  }
}

function normalizeDecision(item: DecisionToHandleItem): ActionItem {
  const kind = item.cta?.redirect_kind
  return {
    key: dismissKey(item),
    ticker: item.ticker,
    asset_name_fr: item.asset_name_fr,
    headline_fr: item.headline_fr,
    verdict_label_fr: item.verdict_label_fr,
    verdict_color: decisionColorFromTier(item.tier),
    price_display: null,
    delta_display: null,
    cta_label: mapCtaLabel(kind, item.cta?.label_fr),
    redirect_kind: kind,
    modal_context: item.cta?.modal_context ?? null,
    alert_id: item.alert_id,
    asset_id: item.asset_id,
  }
}

// ─────────────────────────────────────────────────────────
// Modal slot resolution (unchanged from previous Today).
// ─────────────────────────────────────────────────────────
type ModalSlot =
  | 'open_ladder_modal'
  | 'open_exit_modal'
  | 'open_thesis_modal'
  | 'open_thesis_modal_urgent'

interface PreviewModalState {
  slot: ModalSlot | null
  dispatchContext: DispatchModalContext | null
  assetId: string | null
  ticker: string | null
}

const closedModal: PreviewModalState = {
  slot: null,
  dispatchContext: null,
  assetId: null,
  ticker: null,
}

function toDispatchContext(
  modalContext: ModalContext | null,
  ticker: string,
): DispatchModalContext | null {
  if (!modalContext) return null
  const props = modalContext.props || {}
  const assetId = typeof props.asset_id === 'string' ? props.asset_id : null
  const alertId = typeof props.alert_id === 'string' ? props.alert_id : undefined
  return {
    modal_name: modalContext.modal_name,
    asset_id: assetId,
    alert_id: alertId,
    ticker,
  }
}

function resolveSlot(kind: RedirectKind | undefined): ModalSlot | null {
  switch (kind) {
    case 'open_ladder_modal':
      return 'open_ladder_modal'
    case 'open_exit_modal':
      return 'open_exit_modal'
    case 'open_thesis_modal':
      return 'open_thesis_modal'
    case 'open_thesis_modal_urgent':
      return 'open_thesis_modal_urgent'
    default:
      return null
  }
}

// ─────────────────────────────────────────────────────────
// ActionRow — used by À TRAITER + À PRÉPARER. Carries the
// primary CTA + "Je passe" dismiss.
// ─────────────────────────────────────────────────────────
interface ActionRowProps {
  item: ActionItem
  onCta: (item: ActionItem) => void
  onDismiss: (key: string) => void
  isLast: boolean
}

function ActionRow({ item, onCta, onDismiss, isLast }: ActionRowProps) {
  const accent = verdictTone(item.verdict_color)
  return (
    <li
      data-ticker={item.ticker}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--ink-primary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {item.ticker}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.asset_name_fr}
          </span>
        </span>
        {item.price_display ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 12.5,
              color: 'var(--ink-primary)',
              whiteSpace: 'nowrap',
            }}
          >
            {item.price_display}
          </span>
        ) : null}
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 13,
          color: 'var(--ink-primary)',
          lineHeight: 1.4,
        }}
      >
        {item.verdict_label_fr ? (
          <span style={{ fontWeight: 600, color: accent }}>{item.verdict_label_fr}</span>
        ) : null}
        {item.verdict_label_fr && item.headline_fr ? ' — ' : null}
        {item.headline_fr}
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
          marginTop: 2,
        }}
      >
        <button
          type="button"
          onClick={() => onCta(item)}
          style={{
            minHeight: 36,
            padding: '7px 12px',
            borderRadius: 8,
            border: `1px solid ${accent}`,
            background: 'transparent',
            color: accent,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {item.cta_label}
        </button>
        <button
          type="button"
          onClick={() => onDismiss(item.key)}
          style={{
            minHeight: 36,
            padding: '7px 10px',
            borderRadius: 8,
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--ink-tertiary)',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Je passe
        </button>
        {item.delta_display ? (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              color: 'var(--ink-tertiary)',
            }}
          >
            {item.delta_display}
          </span>
        ) : null}
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// PassiveRow — used by RIEN À FAIRE. No dismiss button (the
// section is passive by design), just a "Voir le setup" link.
// ─────────────────────────────────────────────────────────
interface PassiveRowProps {
  item: ActionItem
  onCta: (item: ActionItem) => void
  isLast: boolean
}

function PassiveRow({ item, onCta, isLast }: PassiveRowProps) {
  const accent = verdictTone(item.verdict_color)
  return (
    <li
      data-ticker={item.ticker}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        padding: '10px 0',
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 8,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--ink-primary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            {item.ticker}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              color: 'var(--ink-secondary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.asset_name_fr}
          </span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-tertiary)',
            lineHeight: 1.4,
          }}
        >
          {item.verdict_label_fr ? (
            <span style={{ color: accent, fontWeight: 600 }}>{item.verdict_label_fr}</span>
          ) : null}
          {item.verdict_label_fr && item.headline_fr ? ' — ' : null}
          {item.headline_fr}
        </span>
      </span>
      <button
        type="button"
        onClick={() => onCta(item)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: accent,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 12,
          fontWeight: 600,
          textDecoration: 'underline',
          textUnderlineOffset: 3,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Voir le setup
      </button>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// HygieneSubblock — inline at the end of "À PRÉPARER".
// Renders fn_todo_list.items as a discreet sub-list. No CTA.
// ─────────────────────────────────────────────────────────
function severityDot(severity: string | undefined): string {
  switch (severity) {
    case 'critical':
      return 'var(--burgundy)'
    case 'warning':
      return '#8B6914'
    case 'info':
    default:
      return 'var(--forest-green)'
  }
}

interface HygieneSubblockProps {
  items: TodoItem[]
}

function HygieneSubblock({ items }: HygieneSubblockProps) {
  if (items.length === 0) return null
  return (
    <div
      style={{
        marginTop: 12,
        paddingTop: 10,
        borderTop: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 10,
          color: 'var(--ink-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 600,
          marginBottom: 6,
        }}
      >
        Hygiène patrimoine · {items.length}
      </div>
      <ul style={listReset}>
        {items.map((it, idx) => (
          <li
            key={it.code}
            style={{
              padding: '6px 0',
              borderBottom:
                idx === items.length - 1 ? 'none' : '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                borderRadius: 999,
                background: severityDot(it.severity),
                marginTop: 7,
                flexShrink: 0,
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span
                style={{
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: 'var(--ink-primary)',
                }}
              >
                {it.title_fr}
              </span>
              {it.subtitle_fr ? (
                <span
                  style={{
                    fontFamily: 'var(--font-editorial-sans)',
                    fontSize: 11,
                    color: 'var(--ink-tertiary)',
                    lineHeight: 1.4,
                  }}
                >
                  {it.subtitle_fr}
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Surface
// ─────────────────────────────────────────────────────────
export function TodaySurface() {
  const router = useRouter()
  const [focus, setFocus] = useState<SurfaceState<FocusTodayPayload>>(initial)
  const [decisions, setDecisions] = useState<SurfaceState<DecisionsToHandlePayload>>(initial)
  const [todos, setTodos] = useState<SurfaceState<TodoListPayload>>(initial)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<PreviewModalState>(closedModal)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<FocusTodayPayload>('/api/mobile/focus-today', ctrl.signal),
      fetchEnvelope<DecisionsToHandlePayload>(
        '/api/mobile/decisions-to-handle',
        ctrl.signal,
      ),
      fetchEnvelope<TodoListPayload>('/api/mobile/todo-list', ctrl.signal),
    ]).then(([f, d, t]) => {
      if (cancelled) return
      setFocus(f)
      setDecisions(d)
      setTodos(t)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const buckets = useMemo(() => {
    const focusItems = focus.data?.priorities ?? []
    const decisionItems = decisions.data?.top_decisions ?? []
    // Deduplicate decisions on asset_id when the focus list already
    // surfaces the same asset — focus carries the richer verdict.
    const focusAssetIds = new Set(
      focusItems.map((p) => p.asset_id).filter((id): id is string => !!id),
    )
    const dedupedDecisions = decisionItems.filter(
      (d) => !d.asset_id || !focusAssetIds.has(d.asset_id),
    )

    const isDismissed = (i: ActionItem) => dismissed.has(i.key)

    const focusByBucket = {
      now: focusItems.filter((i) => focusBucket(i) === 'now').map(normalizeFocus),
      prepare: focusItems
        .filter((i) => focusBucket(i) === 'prepare')
        .map(normalizeFocus),
      nothing: focusItems
        .filter((i) => focusBucket(i) === 'nothing')
        .map(normalizeFocus),
    }
    const decisionsByBucket = {
      now: dedupedDecisions
        .filter((i) => decisionBucket(i) === 'now')
        .map(normalizeDecision),
      prepare: dedupedDecisions
        .filter((i) => decisionBucket(i) === 'prepare')
        .map(normalizeDecision),
      nothing: dedupedDecisions
        .filter((i) => decisionBucket(i) === 'nothing')
        .map(normalizeDecision),
    }

    return {
      now: [...focusByBucket.now, ...decisionsByBucket.now].filter((i) => !isDismissed(i)),
      prepare: [...focusByBucket.prepare, ...decisionsByBucket.prepare].filter(
        (i) => !isDismissed(i),
      ),
      nothing: [...focusByBucket.nothing, ...decisionsByBucket.nothing].filter(
        (i) => !isDismissed(i),
      ),
    }
  }, [focus.data?.priorities, decisions.data?.top_decisions, dismissed])

  const market = focus.data?.market_context

  const handleCta = useCallback(
    (item: ActionItem) => {
      const kind = item.redirect_kind
      if (kind === 'navigate_to_asset') {
        router.push('/sniper')
        return
      }
      const slot = resolveSlot(kind)
      if (!slot) {
        toast.info('Action bientôt disponible')
        return
      }
      const dispatchContext = toDispatchContext(item.modal_context, item.ticker)
      const props = item.modal_context?.props ?? {}
      const assetIdFromProps =
        typeof props.asset_id === 'string' ? props.asset_id : item.asset_id || null
      setModal({ slot, dispatchContext, assetId: assetIdFromProps, ticker: item.ticker })
    },
    [router],
  )

  const handleDismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }, [])

  const closeModal = useCallback(() => {
    setModal(closedModal)
  }, [])

  const headerExtras = market ? (
    <MarketStatusBadge
      euOpen={market.eu_open}
      usOpen={market.us_open}
      regimeLabelFr={market.regime_label_fr}
    />
  ) : null

  const hygiene = todos.data?.items ?? []
  const isLoading = focus.loading || decisions.loading
  const fetchErrored = !!(focus.error && decisions.error)

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Aujourd’hui"
        title="Plan du jour"
        subtitle="Que dois-je traiter maintenant ?"
        extras={headerExtras}
        compact
      />

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <CollapsibleSection
          groupKey="today-now"
          title={
            buckets.now.length > 0
              ? `À traiter maintenant · ${buckets.now.length}`
              : 'À traiter maintenant'
          }
          count={null}
          subtitle="Décisions urgentes ou plans actifs."
          defaultOpen
        >
          {isLoading ? (
            <p style={paragraph}>Chargement…</p>
          ) : fetchErrored ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : buckets.now.length === 0 ? (
            <p style={paragraph}>Rien d’urgent à traiter pour le moment.</p>
          ) : (
            <ul style={listReset}>
              {buckets.now.map((item, idx) => (
                <ActionRow
                  key={item.key}
                  item={item}
                  onCta={handleCta}
                  onDismiss={handleDismiss}
                  isLast={idx === buckets.now.length - 1}
                />
              ))}
            </ul>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          groupKey="today-prepare"
          title={
            buckets.prepare.length > 0
              ? `À préparer · ${buckets.prepare.length}`
              : 'À préparer'
          }
          count={null}
          subtitle="Approche de zone, stratégie ou hygiène à compléter."
          defaultOpen
        >
          {isLoading ? (
            <p style={paragraph}>Chargement…</p>
          ) : fetchErrored ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : (
            <>
              {buckets.prepare.length === 0 ? (
                <p style={paragraph}>Aucune préparation en cours.</p>
              ) : (
                <ul style={listReset}>
                  {buckets.prepare.map((item, idx) => (
                    <ActionRow
                      key={item.key}
                      item={item}
                      onCta={handleCta}
                      onDismiss={handleDismiss}
                      isLast={idx === buckets.prepare.length - 1}
                    />
                  ))}
                </ul>
              )}
              <HygieneSubblock items={hygiene} />
            </>
          )}
        </CollapsibleSection>

        <CollapsibleSection
          groupKey="today-nothing"
          title={
            buckets.nothing.length > 0
              ? `Rien à faire · ${buckets.nothing.length}`
              : 'Rien à faire'
          }
          count={null}
          subtitle="Surveillance seulement, aucune action immédiate."
          defaultOpen={false}
        >
          {isLoading ? (
            <p style={paragraph}>Chargement…</p>
          ) : fetchErrored ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : buckets.nothing.length === 0 ? (
            <p style={paragraph}>Pas d’item passif aujourd’hui.</p>
          ) : (
            <ul style={listReset}>
              {buckets.nothing.map((item, idx) => (
                <PassiveRow
                  key={item.key}
                  item={item}
                  onCta={handleCta}
                  isLast={idx === buckets.nothing.length - 1}
                />
              ))}
            </ul>
          )}
        </CollapsibleSection>
      </div>

      <LadderBuilderModal
        open={modal.slot === 'open_ladder_modal'}
        context={modal.dispatchContext}
        onClose={closeModal}
      />
      <ExitPlanModal
        open={modal.slot === 'open_exit_modal'}
        context={modal.dispatchContext}
        onClose={closeModal}
      />
      <ThesisEditorModal
        open={modal.slot === 'open_thesis_modal' || modal.slot === 'open_thesis_modal_urgent'}
        urgent={modal.slot === 'open_thesis_modal_urgent'}
        assetId={modal.assetId}
        ticker={modal.ticker ?? undefined}
        onClose={closeModal}
      />
    </AppShell>
  )
}

// ─────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────
const paragraph: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
  lineHeight: 1.4,
}

const listReset: React.CSSProperties = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
}
