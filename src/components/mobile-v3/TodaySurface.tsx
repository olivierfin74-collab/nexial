'use client'

// Unified "Aujourd'hui" surface. Mounted at /aujourdhui (production) and
// at /mobile-v3-preview (lab path). AppShell + MobileTopHeader so the
// surface shares the exact same shell, bottom nav and lifecycle as the
// rest of the v3 product.
//
// Hierarchy (top-down):
//   - MobileTopHeader (date + market context + bell + version badge)
//   - Focus du jour (priorities → FocusOpportunityCard, max payload)
//   - Décisions à traiter (DecisionsToHandleCard, top 3)
//   - Sniper (SniperSummaryCard, first 4)
//   - À faire (TodoListCard)
//
// CTAs open the existing v2.2 modals (LadderBuilder / ExitPlan /
// ThesisEditor). No dispatch, no SEEN, no Supabase mutation on load.

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
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

export function TodaySurface() {
  const [focus, setFocus] = useState<SurfaceState<FocusTodayPayload>>(initial)
  const [decisions, setDecisions] = useState<SurfaceState<DecisionsToHandlePayload>>(initial)
  const [snipers, setSnipers] = useState<SurfaceState<SniperDashboardPayload>>(initial)
  const [todos, setTodos] = useState<SurfaceState<TodoListPayload>>(initial)
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
        toast.info('Action bientôt disponible')
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

  const priorities = focus.data?.priorities ?? []
  const marketLabel = focus.data?.market_context?.label_fr
  const regimeLabel = focus.data?.market_context?.regime_label_fr
  const contextLine = [marketLabel, regimeLabel].filter(Boolean).join(' · ')

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Tableau de bord"
        title={focus.data?.title_fr ?? 'Aujourd’hui'}
        subtitle="Que dois-je faire maintenant ?"
        contextLine={contextLine || undefined}
        loudVersion
      />

      <div
        style={{
          maxWidth: 560,
          margin: '0 auto',
          padding: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--ink-primary)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            Focus du jour
          </h2>
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
    </AppShell>
  )
}
