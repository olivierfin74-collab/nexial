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
// "Pas aujourd'hui" est un dismiss local, persistant pour la
// journée afin d'éviter qu'un item ignoré revienne au changement
// de page sans engager une vraie mutation backend.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/shell/AppShell'
import { MarketStatusBadge } from '@/components/shell/MarketStatusBadge'
import { MobileTopHeader } from '@/components/shell/MobileTopHeader'
import {
  useUserAssetThesisBulk,
  type UserAssetThesis,
} from '@/hooks/useUserAssetThesisBulk'
import {
  adjustVerdict,
  type AdjustedSectionHint,
  type OpportunityStandardIntent,
} from '@/lib/adjustVerdict'
import {
  buildCapitalAllocationIntelligence,
  type CapitalAllocationResult,
  type CapitalConvictionLevel,
  type CapitalOpportunityInput,
} from '@/lib/capitalAllocationIntelligence'
// Only ExitPlanModal is still wired through the legacy decisional
// slot — the "Activer le plan d'achat" and "Définir ma stratégie"
// flows are now handled by LocalPlanPanel / LocalStrategyPanel
// rendered inline in this surface (V1 client-only).
import { ExitPlanModal } from '@/components/ui/decisional'
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
      return 'Préparer le plan'
    case 'open_exit_modal':
      return 'Préparer la décision'
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
  sourceRank: number | null
  sourceScore: number | null
  sourceTier: string | null
  strategicFiltered: boolean
  strategicSectionHint: AdjustedSectionHint
}

type AssetThesis = UserAssetThesis & {
  conviction_level?: CapitalConvictionLevel | null
}

function dismissKey(item: { alert_id?: string; asset_id?: string; ticker: string }): string {
  return item.alert_id || item.asset_id || item.ticker
}

const TODAY_DISMISS_STORAGE_KEY = 'nexial.today.dismissed.v1'

function todayDismissDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function readTodayDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(TODAY_DISMISS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as { date?: unknown; keys?: unknown }
    if (parsed.date !== todayDismissDateKey() || !Array.isArray(parsed.keys)) {
      return new Set()
    }
    return new Set(
      parsed.keys.filter(
        (key): key is string => typeof key === 'string' && key.trim().length > 0,
      ),
    )
  } catch {
    return new Set()
  }
}

function writeTodayDismissed(keys: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      TODAY_DISMISS_STORAGE_KEY,
      JSON.stringify({ date: todayDismissDateKey(), keys: Array.from(keys) }),
    )
  } catch {
    // Local persistence is best-effort only; Today must never crash
    // because storage is unavailable.
  }
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
    sourceRank: item.rank,
    sourceScore: item.priority_score,
    sourceTier: null,
    strategicFiltered: false,
    strategicSectionHint: 'standard',
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
    sourceRank: item.rank,
    sourceScore: item.score,
    sourceTier: item.tier,
    strategicFiltered: false,
    strategicSectionHint: 'standard',
  }
}

function parseExplicitDrawdownFromPeak(value: string | null): number | null {
  const text = value?.trim()
  if (!text) return null

  const match = text.match(/^(-?\d+(?:[,.]\d+)?)\s*%\s+du\s+sommet$/i)
  if (!match) return null

  const pct = Number(match[1].replace(',', '.'))
  if (!Number.isFinite(pct)) return null
  return -Math.abs(pct)
}

function standardIntentFromActionItem(item: ActionItem): OpportunityStandardIntent {
  if (item.redirect_kind === 'open_exit_modal') return 'trim'
  if (item.redirect_kind === 'open_ladder_modal') {
    const context = `${item.verdict_label_fr} ${item.headline_fr}`.toLowerCase()
    return context.includes('renfor') || context.includes('position') ? 'reinforce' : 'buy'
  }
  return 'watch'
}

function isHeldFromActionContext(item: ActionItem): boolean {
  const context = `${item.verdict_label_fr} ${item.headline_fr}`.toLowerCase()
  return context.includes('position') || context.includes('renfor')
}

function isOverweightFromActionContext(item: ActionItem): boolean {
  const context = `${item.verdict_label_fr} ${item.headline_fr}`.toLowerCase()
  return context.includes('surpond')
}

function applyAdjustedVerdict(item: ActionItem, thesis: AssetThesis | undefined): ActionItem {
  if (!thesis?.conviction_level) return item

  const drawdownPct = parseExplicitDrawdownFromPeak(item.delta_display)
  const opportunityAcceptable =
    item.verdict_color === 'green' &&
    drawdownPct != null &&
    Number.isFinite(drawdownPct) &&
    drawdownPct <= -8
  const adjusted = adjustVerdict(
    {
      standardVerdict: item.verdict_label_fr || item.verdict_color,
      standardLabel: item.verdict_label_fr,
      standardIntent: standardIntentFromActionItem(item),
      isHeld: isHeldFromActionContext(item),
      isOverweight: isOverweightFromActionContext(item),
      opportunityAcceptable,
      conditionMet: opportunityAcceptable,
    },
    thesis,
  )

  if (adjusted.reason === 'Aucune stratégie avancée définie : règle standard appliquée') {
    return item
  }

  return {
    ...item,
    verdict_label_fr: adjusted.reason,
    headline_fr: '',
    strategicFiltered: adjusted.shouldDisplay === false || adjusted.isFiltered,
    strategicSectionHint: adjusted.sectionHint,
  }
}

// ─────────────────────────────────────────────────────────
// Local action lifecycle — V1 client-only simulation. When the
// user clicks an actionable CTA that opens a decisional modal,
// the item is marked "treated" in a local Map and the row swaps
// its CTA for a visual "Done" chip. State is not persisted: a
// refresh, a data change or a new session restores the items.
// ─────────────────────────────────────────────────────────
function actionItemToCapitalInput(
  item: ActionItem,
  thesis: AssetThesis | undefined,
): CapitalOpportunityInput {
  const drawdownPct = parseExplicitDrawdownFromPeak(item.delta_display)

  return {
    assetId: item.asset_id,
    ticker: item.ticker,
    assetName: item.asset_name_fr,
    convictionLevel: thesis?.conviction_level ?? 'NEUTRAL',
    hasRealThesisSignal: Boolean(thesis?.conviction_level),
    isHeld: Boolean(thesis),
    signalQuality:
      item.verdict_color === 'red'
        ? 'weak'
        : item.verdict_color === 'yellow'
          ? 'positive'
          : item.verdict_color === 'green'
            ? 'strong'
            : 'neutral',
    priceQuality:
      item.verdict_color === 'green'
        ? 'attractive'
        : item.verdict_color === 'yellow'
          ? 'acceptable'
          : 'unknown',
    sectorRoom: 'unknown',
    accountRouting: 'possible',
    weightState: 'unknown',
    drawdownPct,
    sourceRank: item.sourceRank,
    sourceScore: item.sourceScore,
    sourceTier: item.sourceTier,
  }
}

type ActionPhase = 'plan_activated' | 'order_prepared' | 'strategy_defined'

function treatedChipLabel(phase: ActionPhase): string {
  switch (phase) {
    case 'plan_activated':
      return 'Plan activé localement'
    case 'order_prepared':
      return 'Ordre préparé localement'
    case 'strategy_defined':
      return 'Stratégie définie localement'
  }
}

function phaseToSecondaryCta(phase: ActionPhase): string {
  switch (phase) {
    case 'plan_activated':
      return 'Voir le plan'
    case 'order_prepared':
      return 'Voir la préparation'
    case 'strategy_defined':
      return 'Voir le suivi'
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

function slotToPhase(slot: ModalSlot): ActionPhase {
  switch (slot) {
    case 'open_ladder_modal':
      return 'plan_activated'
    case 'open_exit_modal':
      return 'order_prepared'
    case 'open_thesis_modal':
    case 'open_thesis_modal_urgent':
      return 'strategy_defined'
  }
}

// ─────────────────────────────────────────────────────────
// TodaySection — inline collapsible with a structuring title.
// Built locally (rather than reusing CollapsibleSection) so the
// section titles can read stronger and more contrasted on this
// surface, without modifying the shell component.
// ─────────────────────────────────────────────────────────
interface TodaySectionProps {
  groupKey: string
  title: string
  count?: number | null
  subtitle?: string
  defaultOpen?: boolean
  children: ReactNode
}

function TodaySection({
  groupKey,
  title,
  count = null,
  subtitle,
  defaultOpen = true,
  children,
}: TodaySectionProps) {
  const [open, setOpen] = useState(defaultOpen)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <section
      data-collapsible={groupKey}
      data-open={open ? 'true' : 'false'}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 12,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          margin: 0,
          textAlign: 'left',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Chevron
            size={16}
            aria-hidden
            style={{ color: 'var(--ink-secondary)' }}
          />
          <span
            style={{
              fontFamily: 'var(--font-editorial-serif)',
              fontSize: 18,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              letterSpacing: 'var(--tracking-display)',
            }}
          >
            {title}
          </span>
        </span>
        {count != null ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              minWidth: 18,
              textAlign: 'right',
            }}
          >
            {count}
          </span>
        ) : null}
      </button>

      {open && subtitle ? (
        <p
          style={{
            margin: 0,
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 12,
            color: 'var(--ink-secondary)',
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      ) : null}

      {open ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      ) : null}
    </section>
  )
}

// ─────────────────────────────────────────────────────────
// ActionRow — used by À TRAITER + À PRÉPARER. Carries the
// primary CTA + "Pas aujourd'hui" dismiss.
// ─────────────────────────────────────────────────────────
function CapitalAllocationBlock({ result }: { result: CapitalAllocationResult }) {
  const visibleSections = result.sections.filter((section) => section.items.length > 0)
  if (visibleSections.length === 0) return null

  return (
    <TodaySection
      groupKey="today-capital-allocation"
      title="Allocation du capital"
      count={visibleSections.reduce((sum, section) => sum + section.items.length, 0)}
      subtitle="Priorités relatives, sans achat automatique."
      defaultOpen
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visibleSections.map((section) => (
          <div key={section.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--font-editorial-mono)',
                fontSize: 10,
                fontWeight: 700,
                color: 'var(--ink-tertiary)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {section.title}
            </span>
            <ul style={listReset}>
              {section.items.map((item, idx) => (
                <li
                  key={`${section.key}-${item.assetId || item.ticker}`}
                  data-ticker={item.ticker}
                  style={{
                    padding: '8px 0',
                    borderBottom:
                      idx === section.items.length - 1
                        ? 'none'
                        : '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 3,
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'baseline',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-editorial-sans)',
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--ink-primary)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.assetName ?? item.ticker}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-editorial-mono)',
                        fontSize: 10.5,
                        color: 'var(--ink-tertiary)',
                        letterSpacing: '0.04em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {item.ticker}
                    </span>
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-editorial-sans)',
                      fontSize: 12,
                      color: 'var(--ink-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    {item.context}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </TodaySection>
  )
}

interface ActionRowProps {
  item: ActionItem
  treatedPhase: ActionPhase | undefined
  onCta: (item: ActionItem) => void
  onDismiss: (key: string) => void
  isLast: boolean
}

type DecisionFamilyKey = 'reinforcement' | 'buy' | 'exit' | 'wait' | 'standard'

const DECISION_FAMILY_ORDER: DecisionFamilyKey[] = [
  'reinforcement',
  'buy',
  'exit',
  'wait',
  'standard',
]

function decisionFamily(item: ActionItem): DecisionFamilyKey {
  switch (item.strategicSectionHint) {
    case 'strategic_reinforcement':
      return 'reinforcement'
    case 'strategic_buy':
      return 'buy'
    case 'exit':
      return 'exit'
    case 'wait':
    case 'avoid_buy':
      return 'wait'
    case 'standard':
    case 'silent':
    default:
      return 'standard'
  }
}

function decisionFamilyLabel(key: DecisionFamilyKey): string | null {
  switch (key) {
    case 'reinforcement':
      return 'Renforcement'
    case 'buy':
      return 'Achat'
    case 'exit':
      return 'Sortie surveillée'
    case 'wait':
      return 'À surveiller'
    case 'standard':
    default:
      return null
  }
}

function groupedDecisionItems(items: ActionItem[]): Array<{ key: DecisionFamilyKey; items: ActionItem[] }> {
  return DECISION_FAMILY_ORDER.map((key) => ({
    key,
    items: items.filter((item) => decisionFamily(item) === key),
  })).filter((group) => group.items.length > 0)
}

interface GroupedActionRowsProps {
  items: ActionItem[]
  treated: Map<string, ActionPhase>
  onCta: (item: ActionItem) => void
  onDismiss: (key: string) => void
}

function GroupedActionRows({ items, treated, onCta, onDismiss }: GroupedActionRowsProps) {
  const groups = groupedDecisionItems(items)
  let rendered = 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {groups.map((group) => {
        const label = decisionFamilyLabel(group.key)
        return (
          <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {label ? <span style={decisionFamilyHeading}>{label}</span> : null}
            <ul style={listReset}>
              {group.items.map((item) => {
                rendered += 1
                return (
                  <ActionRow
                    key={item.key}
                    item={item}
                    treatedPhase={treated.get(item.key)}
                    onCta={onCta}
                    onDismiss={onDismiss}
                    isLast={rendered === items.length}
                  />
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

function ActionRow({ item, treatedPhase, onCta, onDismiss, isLast }: ActionRowProps) {
  const accent = verdictTone(item.verdict_color)
  return (
    <li
      data-ticker={item.ticker}
      data-treated={treatedPhase ?? undefined}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        padding: '12px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        opacity: treatedPhase ? 0.78 : 1,
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
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.asset_name_fr}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {item.ticker}
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
        {treatedPhase ? (
          <span
            data-status="treated"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 12px',
              minHeight: 36,
              borderRadius: 8,
              border: '1px solid var(--forest-green)',
              background: 'rgba(45,107,31,0.08)',
              color: 'var(--forest-green)',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <Check size={12} aria-hidden />
            {treatedChipLabel(treatedPhase)}
          </span>
        ) : (
          <>
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
              Pas aujourd'hui
            </button>
          </>
        )}
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
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.asset_name_fr}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 10.5,
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {item.ticker}
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
// TrackingRow — used by "Suivi du jour". An item that the user
// has handled today: shown with a "Done" green chip and a
// secondary link to re-open the modal that was originally fired
// ("Voir le plan" / "Voir l'ordre" / "Voir le suivi" depending
// on the action phase).
// ─────────────────────────────────────────────────────────
interface TrackingRowProps {
  item: ActionItem
  phase: ActionPhase
  onReopen: (item: ActionItem) => void
  isLast: boolean
}

function TrackingRow({ item, phase, onReopen, isLast }: TrackingRowProps) {
  return (
    <li
      data-ticker={item.ticker}
      data-tracking={phase}
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--border-subtle)',
        padding: '10px 0',
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
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--ink-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.asset_name_fr}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 11,
              fontWeight: 500,
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              flexShrink: 0,
            }}
          >
            {item.ticker}
          </span>
        </span>
        {item.price_display ? (
          <span
            style={{
              fontFamily: 'var(--font-editorial-mono)',
              fontSize: 12,
              color: 'var(--ink-tertiary)',
              whiteSpace: 'nowrap',
            }}
          >
            {item.price_display}
          </span>
        ) : null}
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span
          data-status="treated"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 10px',
            borderRadius: 999,
            border: '1px solid var(--forest-green)',
            background: 'rgba(45,107,31,0.08)',
            color: 'var(--forest-green)',
            fontFamily: 'var(--font-editorial-sans)',
            fontSize: 11.5,
            fontWeight: 600,
          }}
        >
          <Check size={12} aria-hidden />
          {treatedChipLabel(phase)}
        </span>
        <button
          type="button"
          onClick={() => onReopen(item)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            color: 'var(--ink-secondary)',
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
          {phaseToSecondaryCta(phase)}
        </button>
      </div>
    </li>
  )
}

// ─────────────────────────────────────────────────────────
// LocalPanel — V1 simple in-app panel used by "Activer le plan
// d'achat" and "Définir ma stratégie". Replaces the heavier
// LadderBuilderModal / ThesisEditorModal placeholders so the user
// sees real, immediate UX (no "Plan d'entrée bientôt disponible"
// dead-end). All actions are local-only; nothing is sent to a
// broker, nothing is written to the backend.
// ─────────────────────────────────────────────────────────
type LocalPanelKind = 'plan' | 'strategy'

interface LocalPanelState {
  kind: LocalPanelKind
  item: ActionItem
}

interface LocalPlanPanelProps {
  item: ActionItem
  onConfirm: () => void
  onClose: () => void
}

function LocalPlanPanel({ item, onConfirm, onClose }: LocalPlanPanelProps) {
  const accent = verdictTone(item.verdict_color)
  return (
    <div
      data-panel="local-plan"
      style={{
        width: '100%',
        maxWidth: 480,
        background: 'var(--surface)',
        borderRadius: 14,
        boxShadow: '0 -12px 30px rgba(0,0,0,0.18)',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 10,
          color: 'var(--ink-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
        }}
      >
        Préparer le plan
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 1.2,
          }}
        >
          {item.asset_name_fr}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-tertiary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {item.ticker}
        </span>
      </div>

      <dl
        style={{
          margin: 0,
          display: 'grid',
          gridTemplateColumns: 'minmax(120px,auto) 1fr',
          rowGap: 6,
          columnGap: 12,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 13,
        }}
      >
        {item.price_display ? (
          <>
            <dt style={panelMeta}>Prix actuel</dt>
            <dd style={{ ...panelValue, justifySelf: 'end' }}>{item.price_display}</dd>
          </>
        ) : null}
        {item.delta_display ? (
          <>
            <dt style={panelMeta}>Distance avant achat</dt>
            <dd style={{ ...panelValue, justifySelf: 'end' }}>{item.delta_display}</dd>
          </>
        ) : null}
        {item.verdict_label_fr ? (
          <>
            <dt style={panelMeta}>Verdict</dt>
            <dd style={{ ...panelValue, color: accent, fontWeight: 600, justifySelf: 'end' }}>
              {item.verdict_label_fr}
            </dd>
          </>
        ) : null}
      </dl>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 11.5,
          lineHeight: 1.5,
          color: 'var(--ink-tertiary)',
        }}
      >
        Activation locale V1. Aucune action marché, aucune écriture
        backend. Le suivi reste sur cet appareil.
      </p>

      <button
        type="button"
        onClick={onConfirm}
        style={{
          minHeight: 44,
          padding: '12px 14px',
          borderRadius: 10,
          border: '1px solid var(--forest-green)',
          background: 'var(--forest-green)',
          color: '#FFFFFF',
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Activer en suivi local
      </button>

      <button
        type="button"
        onClick={onClose}
        style={panelCancel}
      >
        Annuler
      </button>
    </div>
  )
}

interface LocalStrategyPanelProps {
  item: ActionItem
  onChoose: () => void
  onClose: () => void
}

const STRATEGY_CHOICES = [
  'Core long terme',
  'Opportuniste',
  'À ignorer pour l’instant',
] as const

function LocalStrategyPanel({ item, onChoose, onClose }: LocalStrategyPanelProps) {
  return (
    <div
      data-panel="local-strategy"
      style={{
        width: '100%',
        maxWidth: 480,
        background: 'var(--surface)',
        borderRadius: 14,
        boxShadow: '0 -12px 30px rgba(0,0,0,0.18)',
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-editorial-mono)',
          fontSize: 10,
          color: 'var(--ink-tertiary)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          fontWeight: 600,
        }}
      >
        Définir ma stratégie
      </span>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--font-editorial-serif)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--ink-primary)',
            letterSpacing: 'var(--tracking-display)',
            lineHeight: 1.2,
          }}
        >
          {item.asset_name_fr}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-editorial-mono)',
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--ink-tertiary)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          {item.ticker}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontFamily: 'var(--font-editorial-sans)',
          fontSize: 11.5,
          lineHeight: 1.5,
          color: 'var(--ink-tertiary)',
        }}
      >
        Choix local V1. Aucune écriture backend, le suivi reste sur cet appareil.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STRATEGY_CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            onClick={onChoose}
            style={{
              minHeight: 44,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border-subtle)',
              background: 'var(--surface)',
              color: 'var(--ink-primary)',
              fontFamily: 'var(--font-editorial-sans)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {choice}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onClose}
        style={panelCancel}
      >
        Annuler
      </button>
    </div>
  )
}

const panelMeta: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.04em',
  textTransform: 'uppercase',
  fontWeight: 500,
}

const panelValue: React.CSSProperties = {
  margin: 0,
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 13,
  color: 'var(--ink-primary)',
}

const panelCancel: React.CSSProperties = {
  alignSelf: 'center',
  background: 'transparent',
  border: 'none',
  padding: '4px 8px',
  color: 'var(--ink-tertiary)',
  fontFamily: 'var(--font-editorial-sans)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
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
  const [treated, setTreated] = useState<Map<string, ActionPhase>>(new Map())
  const [localPanel, setLocalPanel] = useState<LocalPanelState | null>(null)
  const [modal, setModal] = useState<PreviewModalState>(closedModal)

  useEffect(() => {
    setDismissed(readTodayDismissed())
  }, [])

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

  const thesisAssetIds = useMemo(() => {
    const ids = [
      ...(focus.data?.priorities ?? []).map((item) => item.asset_id),
      ...(decisions.data?.top_decisions ?? []).map((item) => item.asset_id),
    ].filter((id): id is string => typeof id === 'string' && id.length > 0)
    return Array.from(new Set(ids)).sort()
  }, [focus.data?.priorities, decisions.data?.top_decisions])

  const { thesesByAssetId } = useUserAssetThesisBulk({ assetIds: thesisAssetIds })

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
    const isTreated = (i: ActionItem) => treated.has(i.key)

    const withAdjustedVerdict = (item: ActionItem) =>
      applyAdjustedVerdict(item, thesesByAssetId[item.asset_id] as AssetThesis | undefined)

    const focusByBucket = {
      now: focusItems
        .filter((i) => focusBucket(i) === 'now')
        .map(normalizeFocus)
        .map(withAdjustedVerdict),
      prepare: focusItems
        .filter((i) => focusBucket(i) === 'prepare')
        .map(normalizeFocus)
        .map(withAdjustedVerdict),
      nothing: focusItems
        .filter((i) => focusBucket(i) === 'nothing')
        .map(normalizeFocus)
        .map(withAdjustedVerdict),
    }
    const decisionsByBucket = {
      now: dedupedDecisions
        .filter((i) => decisionBucket(i) === 'now')
        .map(normalizeDecision)
        .map(withAdjustedVerdict),
      prepare: dedupedDecisions
        .filter((i) => decisionBucket(i) === 'prepare')
        .map(normalizeDecision)
        .map(withAdjustedVerdict),
      nothing: dedupedDecisions
        .filter((i) => decisionBucket(i) === 'nothing')
        .map(normalizeDecision)
        .map(withAdjustedVerdict),
    }

    // Combine raw active buckets (items that came from "now" or
    // "prepare" originally). Once treated, an item is routed to the
    // tracking bucket regardless of its original bucket. Dismissed
    // items disappear from every bucket.
    const activeNow = [...focusByBucket.now, ...decisionsByBucket.now]
    const activePrepare = [...focusByBucket.prepare, ...decisionsByBucket.prepare]
    const rawNow = activeNow.filter((i) => !i.strategicFiltered)
    const rawPrepare = activePrepare.filter((i) => !i.strategicFiltered)
    const rawNothing = [
      ...focusByBucket.nothing,
      ...decisionsByBucket.nothing,
      ...activeNow.filter((i) => i.strategicFiltered),
      ...activePrepare.filter((i) => i.strategicFiltered),
    ].sort((a, b) => Number(b.strategicFiltered) - Number(a.strategicFiltered))

    const tracking = [...rawNow, ...rawPrepare]
      .filter((i) => isTreated(i) && !isDismissed(i))
      .reduce<ActionItem[]>((acc, item) => {
        if (acc.some((x) => x.key === item.key)) return acc
        acc.push(item)
        return acc
      }, [])

    return {
      now: rawNow.filter((i) => !isDismissed(i) && !isTreated(i)),
      prepare: rawPrepare.filter((i) => !isDismissed(i) && !isTreated(i)),
      tracking,
      nothing: rawNothing.filter((i) => !isDismissed(i)),
    }
  }, [
    focus.data?.priorities,
    decisions.data?.top_decisions,
    dismissed,
    treated,
    thesesByAssetId,
  ])

  const capitalAllocation = useMemo<CapitalAllocationResult>(() => {
    const items = [...buckets.now, ...buckets.prepare, ...buckets.nothing]
    return buildCapitalAllocationIntelligence(
      items.map((item) =>
        actionItemToCapitalInput(
          item,
          thesesByAssetId[item.asset_id] as AssetThesis | undefined,
        ),
      ),
    )
  }, [buckets, thesesByAssetId])

  const market = focus.data?.market_context

  const handleCta = useCallback(
    (item: ActionItem) => {
      const kind = item.redirect_kind
      if (kind === 'navigate_to_asset') {
        router.push('/sniper')
        return
      }
      // V1 local panels — replace the heavy decisional placeholders
      // with simple in-app panels for "Activer le plan d'achat" and
      // "Définir ma stratégie". Item is marked treated only on
      // confirm (see handleConfirmLocalPanel below).
      if (kind === 'open_ladder_modal') {
        setLocalPanel({ kind: 'plan', item })
        return
      }
      if (kind === 'open_thesis_modal' || kind === 'open_thesis_modal_urgent') {
        setLocalPanel({ kind: 'strategy', item })
        return
      }
      // Legacy decisional modal flow for the remaining slot
      // (open_exit_modal). Mark treated on open as before.
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
      const phase = slotToPhase(slot)
      setTreated((prev) => {
        if (prev.get(item.key) === phase) return prev
        const next = new Map(prev)
        next.set(item.key, phase)
        return next
      })
    },
    [router],
  )

  const handleConfirmLocalPanel = useCallback(
    (phase: ActionPhase) => {
      setLocalPanel((current) => {
        if (!current) return null
        const key = current.item.key
        setTreated((prev) => {
          if (prev.get(key) === phase) return prev
          const next = new Map(prev)
          next.set(key, phase)
          return next
        })
        return null
      })
    },
    [],
  )

  const handleCloseLocalPanel = useCallback(() => {
    setLocalPanel(null)
  }, [])

  const handleDismiss = useCallback((key: string) => {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(key)
      writeTodayDismissed(next)
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
        <CapitalAllocationBlock result={capitalAllocation} />

        <TodaySection
          groupKey="today-now"
          title="À traiter maintenant"
          count={buckets.now.length || null}
          subtitle="Décisions urgentes ou plans actifs."
          defaultOpen
        >
          {isLoading ? (
            <p style={paragraph}>Chargement…</p>
          ) : fetchErrored ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : buckets.now.length === 0 ? (
            <p style={paragraph}>Tout est traité pour le moment.</p>
          ) : (
            <GroupedActionRows
              items={buckets.now}
              treated={treated}
              onCta={handleCta}
              onDismiss={handleDismiss}
            />
          )}
        </TodaySection>

        <TodaySection
          groupKey="today-prepare"
          title="À préparer"
          count={buckets.prepare.length || null}
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
                <GroupedActionRows
                  items={buckets.prepare}
                  treated={treated}
                  onCta={handleCta}
                  onDismiss={handleDismiss}
                />
              )}
              <HygieneSubblock items={hygiene} />
            </>
          )}
        </TodaySection>

        <TodaySection
          groupKey="today-tracking"
          title="Suivi du jour"
          count={buckets.tracking.length || null}
          subtitle="Actions traitées à surveiller."
          defaultOpen={false}
        >
          {buckets.tracking.length === 0 ? (
            <p style={paragraph}>Aucune action traitée pour le moment.</p>
          ) : (
            <ul style={listReset}>
              {buckets.tracking.map((item, idx) => {
                const phase = treated.get(item.key)
                if (!phase) return null
                return (
                  <TrackingRow
                    key={item.key}
                    item={item}
                    phase={phase}
                    onReopen={handleCta}
                    isLast={idx === buckets.tracking.length - 1}
                  />
                )
              })}
            </ul>
          )}
        </TodaySection>

        <TodaySection
          groupKey="today-nothing"
          title="À surveiller"
          count={buckets.nothing.length || null}
          subtitle="Patience, suivi ou attente d’un meilleur timing."
          defaultOpen={false}
        >
          {isLoading ? (
            <p style={paragraph}>Chargement…</p>
          ) : fetchErrored ? (
            <p style={paragraph}>Certaines données n’ont pas pu être mises à jour.</p>
          ) : buckets.nothing.length === 0 ? (
            <p style={paragraph}>Aucun suivi secondaire aujourd’hui.</p>
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
        </TodaySection>
      </div>

      <ExitPlanModal
        open={modal.slot === 'open_exit_modal'}
        context={modal.dispatchContext}
        onClose={closeModal}
      />

      {localPanel ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseLocalPanel()
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(15,15,15,0.42)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {localPanel.kind === 'plan' ? (
            <LocalPlanPanel
              item={localPanel.item}
              onConfirm={() => handleConfirmLocalPanel('plan_activated')}
              onClose={handleCloseLocalPanel}
            />
          ) : (
            <LocalStrategyPanel
              item={localPanel.item}
              onChoose={() => handleConfirmLocalPanel('strategy_defined')}
              onClose={handleCloseLocalPanel}
            />
          )}
        </div>
      ) : null}
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

const decisionFamilyHeading: React.CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
}
