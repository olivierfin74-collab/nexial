'use client'

// Isolated preview page for the v3 mobile contracts.
//
// This route is intentionally:
//   - NOT mounted on any bottom-nav tab
//   - NOT replacing /mobile or /aujourdhui
//   - NOT calling NexialApp or any legacy monolith
//
// CTA wiring (NEXIAL MOBILE v3.0.4.1):
//   - Opens the existing v2.2 modals (LadderBuilder / ExitPlan /
//     ThesisEditor) directly from item.cta.redirect_kind + modal_context.
//   - Never calls fn_dispatch_alert_action, never marks SEEN, never
//     mutates Supabase. Closing the modal is a local state reset, no
//     refetch. The preview is for visual validation only.

import { useCallback, useEffect, useState } from 'react'
import { DecisionsToHandleCard } from '@/components/mobile-v3/DecisionsToHandleCard'
import { FocusOpportunityCard } from '@/components/mobile-v3/FocusOpportunityCard'
import { SniperSummaryCard } from '@/components/mobile-v3/SniperSummaryCard'
import { TodoListCard } from '@/components/mobile-v3/TodoListCard'
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
  SniperDashboardPayload,
  TodoListPayload,
} from '@/types/nexial-v3'

interface SurfaceState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const initialState = <T,>(): SurfaceState<T> => ({ data: null, loading: true, error: null })

async function fetchEnvelope<T>(path: string, signal?: AbortSignal): Promise<SurfaceState<T>> {
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

type ModalSlot =
  | 'open_ladder_modal'
  | 'open_exit_modal'
  | 'open_thesis_modal'
  | 'open_thesis_modal_urgent'

interface PreviewModalState {
  slot: ModalSlot | null
  /** Adapter shape understood by the v2.2 modals (Ladder / Exit). */
  dispatchContext: DispatchModalContext | null
  /** Direct props for ThesisEditorModal. */
  assetId: string | null
  ticker: string | null
}

const closedModal: PreviewModalState = {
  slot: null,
  dispatchContext: null,
  assetId: null,
  ticker: null,
}

/**
 * Build the v2.2 DispatchModalContext shape from a v3 modal_context.
 * Pure translation, no derivation: v3 ships `{ modal_name, props: {...} }`
 * whereas the v2.2 modals expect the modal_name + flattened ids + ticker.
 */
function toDispatchContext(
  modalContext: ModalContext | null | undefined,
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

export default function MobileV3PreviewPage() {
  const [focus, setFocus] = useState<SurfaceState<FocusTodayPayload>>(initialState)
  const [decisions, setDecisions] = useState<SurfaceState<DecisionsToHandlePayload>>(initialState)
  const [snipers, setSnipers] = useState<SurfaceState<SniperDashboardPayload>>(initialState)
  const [todos, setTodos] = useState<SurfaceState<TodoListPayload>>(initialState)
  const [modal, setModal] = useState<PreviewModalState>(closedModal)

  useEffect(() => {
    const ctrl = new AbortController()
    let cancelled = false

    Promise.all([
      fetchEnvelope<FocusTodayPayload>('/api/mobile/focus-today', ctrl.signal),
      fetchEnvelope<DecisionsToHandlePayload>('/api/mobile/decisions-to-handle', ctrl.signal),
      fetchEnvelope<SniperDashboardPayload>('/api/mobile/sniper-dashboard', ctrl.signal),
      fetchEnvelope<TodoListPayload>('/api/mobile/todo-list', ctrl.signal),
    ]).then(([f, d, s, t]) => {
      if (cancelled) return
      setFocus(f)
      setDecisions(d)
      setSnipers(s)
      setTodos(t)
    })

    return () => {
      cancelled = true
      ctrl.abort()
    }
  }, [])

  const openCtaModal = useCallback(
    (kind: RedirectKind | undefined, modalContext: ModalContext | null | undefined, ticker: string) => {
      const slot = resolveSlot(kind)
      if (!slot) {
        // Preview-only: log unknown kinds. No navigation, no mutation.
        // eslint-disable-next-line no-console
        console.log('[mobile-v3-preview] redirect_kind not wired in preview', { kind, ticker })
        return
      }
      const dispatchContext = toDispatchContext(modalContext ?? null, ticker)
      const props = modalContext?.props ?? {}
      const assetIdFromProps = typeof props.asset_id === 'string' ? props.asset_id : null
      setModal({
        slot,
        dispatchContext,
        assetId: assetIdFromProps,
        ticker,
      })
    },
    [],
  )

  const closeModal = useCallback(() => {
    setModal(closedModal)
  }, [])

  const handleFocusCta = useCallback(
    (item: FocusTodayItem) => {
      openCtaModal(item.cta?.redirect_kind, item.cta?.modal_context ?? null, item.ticker)
    },
    [openCtaModal],
  )

  const handleDecisionCta = useCallback(
    (item: DecisionToHandleItem) => {
      openCtaModal(item.cta?.redirect_kind, item.cta?.modal_context ?? null, item.ticker)
    },
    [openCtaModal],
  )

  const handleOverflow = useCallback((p: DecisionsToHandlePayload) => {
    // Preview placeholder: do not navigate. The future Alerts surface
    // will own this transition. Keep a calm log for QA traceability.
    // eslint-disable-next-line no-console
    console.log('[mobile-v3-preview] overflow', {
      total: p.total_decisions,
      count: p.overflow_link?.count ?? null,
      redirect_kind: p.overflow_link?.redirect_kind ?? null,
    })
  }, [])

  const priorities = focus.data?.priorities ?? []

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#FBF9F4',
        padding: '20px 16px 48px',
      }}
    >
      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 10,
              color: 'var(--ink-muted)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-eyebrow)',
            }}
          >
            Preview v3.0.4.1 · 96ed8c6
          </span>
          <h1
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 28,
              fontWeight: 500,
              color: 'var(--forest-deep)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {focus.data?.title_fr ?? 'Focus du jour'}
          </h1>
          {focus.data?.market_context?.label_fr ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-secondary)',
              }}
            >
              {focus.data.market_context.label_fr}
              {focus.data.market_context.regime_label_fr
                ? ` · ${focus.data.market_context.regime_label_fr}`
                : ''}
            </p>
          ) : null}
        </header>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {focus.loading ? (
            <p
              aria-busy="true"
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Chargement…
            </p>
          ) : focus.error ? (
            <p
              role="status"
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-secondary)',
              }}
            >
              Certaines données n’ont pas pu être mises à jour.
            </p>
          ) : priorities.length === 0 ? (
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-editorial-sans)',
                fontSize: 12,
                color: 'var(--ink-tertiary)',
              }}
            >
              Aucune priorité pour le moment.
            </p>
          ) : (
            priorities.map((item) => (
              <FocusOpportunityCard
                key={item.alert_id || item.asset_id || item.ticker}
                item={item}
                onCta={handleFocusCta}
              />
            ))
          )}
        </section>

        <DecisionsToHandleCard
          payload={decisions.data}
          loading={decisions.loading}
          error={decisions.error}
          maxVisible={3}
          onItemCta={handleDecisionCta}
          onOverflow={handleOverflow}
        />

        <SniperSummaryCard
          payload={snipers.data}
          loading={snipers.loading}
          error={snipers.error}
        />

        <TodoListCard payload={todos.data} loading={todos.loading} error={todos.error} />
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
    </div>
  )
}
