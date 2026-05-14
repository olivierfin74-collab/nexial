'use client'

// Unified "Aujourd'hui" surface (UX-R1).
//
// Hierarchy (top-down, all collapsible, default open):
//   - MobileTopHeader (eyebrow + title + subtitle + MarketStatusBadge
//     + bell + ⚙️ + loud version badge)
//   - Focus du jour (priorities → FocusOpportunityCard)
//   - Alertes / Opportunités (DecisionsToHandleCard)
//   - Sniper (résumé compact)
//   - À faire (en bas)
//
// CTAs open the existing v2.2 modals (LadderBuilder / ExitPlan /
// ThesisEditor). No dispatch, no SEEN, no Supabase mutation on load.

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/shell/AppShell'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import { CollapsibleSection } from '@/components/shell/CollapsibleSection'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { DecisionsToHandleCard } from '@/components/mobile-v3/DecisionsToHandleCard'
import { FocusOpportunityCard } from '@/components/mobile-v3/FocusOpportunityCard'
import { OpenSniperCta } from '@/components/mobile-v3/OpenSniperCta'
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
  const market = focus.data?.market_context
  const summary = snipers.data?.summary
  const totalDecisions = decisions.data?.total_decisions ?? null
  const totalTodos = todos.data?.total_count ?? null

  const headerExtras =
    market != null ? (
      <MarketStatusBadge
        euOpen={market.eu_open}
        usOpen={market.us_open}
        regimeLabelFr={market.regime_label_fr}
      />
    ) : null

  return (
    <AppShell>
      <MobileTopHeader
        eyebrow="Tableau de bord"
        title={focus.data?.title_fr ?? 'Aujourd’hui'}
        subtitle="Que dois-je faire maintenant ?"
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
          groupKey="focus-du-jour"
          title="Focus du jour"
          count={priorities.length || null}
          subtitle="Les opportunités à regarder en premier."
          defaultOpen
        >
          {focus.loading ? (
            <p style={paragraph}>Chargement…</p>
          ) : focus.error ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : priorities.length === 0 ? (
            <p style={paragraph}>Aucune priorité pour le moment.</p>
          ) : (
            priorities.map((item) => (
              <FocusOpportunityCard
                key={item.alert_id || item.asset_id || item.ticker}
                item={item}
                onCta={handleFocusCta}
              />
            ))
          )}
        </CollapsibleSection>

        <CollapsibleSection
          groupKey="alertes-opportunites"
          title="Alertes / Opportunités"
          count={totalDecisions}
          subtitle="Décisions à traiter aujourd’hui."
          defaultOpen
        >
          <DecisionsToHandleCard
            payload={decisions.data}
            loading={decisions.loading}
            error={decisions.error}
            maxVisible={3}
            onItemCta={handleDecisionCta}
          />
        </CollapsibleSection>

        <CollapsibleSection
          groupKey="sniper-resume"
          title="Sniper résumé"
          count={summary?.total_count ?? null}
          subtitle="Actifs surveillés de près."
          defaultOpen={false}
        >
          <SniperSummaryCard
            payload={snipers.data}
            loading={snipers.loading}
            error={snipers.error}
          />
          <OpenSniperCta helper="Surveillance rapprochée + Suivi normal." />
        </CollapsibleSection>

        <CollapsibleSection
          groupKey="a-faire"
          title="À faire"
          count={totalTodos}
          subtitle="Hygiène patrimoine."
          defaultOpen={false}
        >
          <TodoListCard payload={todos.data} loading={todos.loading} error={todos.error} />
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

const paragraph: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  color: 'var(--ink-tertiary)',
  lineHeight: 1.4,
}
