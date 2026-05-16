// Capital Allocation Intelligence V1.
//
// Pure frontend classification layer. No fetch, no API contract, no
// backend dependency. The future integration can pass conviction_level
// from user_position_thesis when a clean bulk source exists.

export type CapitalConvictionLevel =
  | 'CORE_HOLD'
  | 'STRONG_BUY'
  | 'BUY_DIPS'
  | 'NEUTRAL'
  | 'EXIT_ON_RALLY'
  | 'TRIM_ON_RALLY'
  | 'EXIT_NOW'
  | (string & {})

export type CapitalSectionKey =
  | 'strategic_reinforcement'
  | 'buy_the_dip'
  | 'priority_new_opportunities'
  | 'exit_watch'

export type CapitalHiddenReason =
  | 'core_hold'
  | 'strategy_conflict'
  | 'dip_not_deep_enough'
  | 'sector_saturated'
  | 'not_priority_now'

export type CapitalSignalQuality = 'strong' | 'positive' | 'neutral' | 'weak'
export type CapitalPriceQuality = 'attractive' | 'acceptable' | 'extended' | 'unknown'
export type CapitalSectorRoom = 'open' | 'limited' | 'saturated' | 'unknown'
export type CapitalAccountRouting = 'clear' | 'possible' | 'unclear' | 'blocked'
export type CapitalWeightState = 'underweight' | 'balanced' | 'overweight' | 'unknown'

export interface CapitalOpportunityInput {
  assetId?: string | null
  ticker: string
  assetName?: string | null
  sector?: string | null
  convictionLevel?: CapitalConvictionLevel | null
  hasRealThesisSignal?: boolean
  isHeld?: boolean
  signalQuality?: CapitalSignalQuality
  priceQuality?: CapitalPriceQuality
  sectorRoom?: CapitalSectorRoom
  accountRouting?: CapitalAccountRouting
  weightState?: CapitalWeightState
  targetGapPct?: number | null
  drawdownPct?: number | null
  capitalAvailable?: boolean
  sourceRank?: number | null
  sourceScore?: number | null
  sourceTier?: string | null
}

export interface CapitalAllocationItem {
  assetId?: string | null
  ticker: string
  assetName: string | null
  sector: string | null
  section: CapitalSectionKey
  title: string
  context: string
  posture: 'prepare' | 'wait' | 'watch_exit'
  capitalUse: 'candidate' | 'deferred' | 'avoid_buy'
}

export interface CapitalAllocationSection {
  key: CapitalSectionKey
  title: string
  items: CapitalAllocationItem[]
}

export interface CapitalHiddenItem {
  ticker: string
  assetName: string | null
  reason: CapitalHiddenReason
  context: string
}

export interface CapitalAllocationResult {
  sections: CapitalAllocationSection[]
  hidden: CapitalHiddenItem[]
}

const SECTION_TITLES: Record<CapitalSectionKey, string> = {
  strategic_reinforcement: 'Renforcement suivant plan stratégique',
  buy_the_dip: 'Achat sur repli',
  priority_new_opportunities: 'Nouvelles opportunités prioritaires',
  exit_watch: 'À surveiller pour sortie',
}

const SECTION_ORDER: CapitalSectionKey[] = [
  'strategic_reinforcement',
  'buy_the_dip',
  'priority_new_opportunities',
  'exit_watch',
]

type CapitalSortableItem = CapitalAllocationItem & {
  relevance: number
  sourceRank?: number | null
  sourceScore?: number | null
  sourceTier?: string | null
}

function normaliseConviction(value: CapitalConvictionLevel | null | undefined): CapitalConvictionLevel {
  return value ?? 'NEUTRAL'
}

function scoreSignal(value: CapitalSignalQuality | undefined): number {
  if (value === 'strong') return 1
  if (value === 'positive') return 0.7
  if (value === 'neutral') return 0.35
  return 0
}

function scoreTargetGap(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0.35
  if (value >= 20) return 1
  if (value >= 12) return 0.75
  if (value >= 6) return 0.45
  return 0.1
}

function scoreSectorRoom(value: CapitalSectorRoom | undefined): number {
  if (value === 'open') return 1
  if (value === 'limited') return 0.45
  if (value === 'saturated') return 0
  return 0.35
}

function scoreRouting(value: CapitalAccountRouting | undefined): number {
  if (value === 'clear') return 1
  if (value === 'possible') return 0.6
  if (value === 'blocked') return 0
  return 0.35
}

function sourceTierPriority(value: string | null | undefined): number {
  if (value === 'CRITIQUE') return 4
  if (value === 'ACTION') return 3
  if (value === 'SURVEILLANCE') return 2
  if (value === 'INFORMATION') return 1
  return 0
}

function sourceRankPriority(value: number | null | undefined): number {
  return value != null && Number.isFinite(value) ? value : Number.POSITIVE_INFINITY
}

function sourceScorePriority(value: number | null | undefined): number {
  return value != null && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY
}

function compareAllocationItems(a: CapitalSortableItem, b: CapitalSortableItem): number {
  const relevanceDelta = b.relevance - a.relevance
  if (Math.abs(relevanceDelta) > 0.02) return relevanceDelta

  return (
    sourceTierPriority(b.sourceTier) - sourceTierPriority(a.sourceTier) ||
    sourceRankPriority(a.sourceRank) - sourceRankPriority(b.sourceRank) ||
    sourceScorePriority(b.sourceScore) - sourceScorePriority(a.sourceScore) ||
    a.ticker.localeCompare(b.ticker)
  )
}

function personalCapitalRelevance(item: CapitalOpportunityInput): number {
  return (
    scoreSignal(item.signalQuality) * 0.4 +
    scoreTargetGap(item.targetGapPct) * 0.3 +
    scoreSectorRoom(item.sectorRoom) * 0.2 +
    scoreRouting(item.accountRouting) * 0.1
  )
}

function hasEnoughWeakness(item: CapitalOpportunityInput): boolean {
  if (item.drawdownPct != null && Number.isFinite(item.drawdownPct)) {
    return item.drawdownPct <= -8
  }
  return false
}

function hasRealStrategicSignal(item: CapitalOpportunityInput, conviction: CapitalConvictionLevel): boolean {
  return item.hasRealThesisSignal === true || conviction !== 'NEUTRAL'
}

function hasSolidPriorityInputs(item: CapitalOpportunityInput): boolean {
  const hasAllocationDefaultsOnly =
    item.sectorRoom === 'unknown' &&
    item.weightState === 'unknown' &&
    item.accountRouting === 'possible' &&
    item.targetGapPct == null

  return !hasAllocationDefaultsOnly
}

function baseItem(
  item: CapitalOpportunityInput,
  section: CapitalSectionKey,
  title: string,
  context: string,
  posture: CapitalAllocationItem['posture'],
  capitalUse: CapitalAllocationItem['capitalUse'],
): CapitalAllocationItem {
  return {
    assetId: item.assetId,
    ticker: item.ticker,
    assetName: item.assetName ?? null,
    sector: item.sector ?? null,
    section,
    title,
    context,
    posture,
    capitalUse,
  }
}

function hidden(
  item: CapitalOpportunityInput,
  reason: CapitalHiddenReason,
  context: string,
): CapitalHiddenItem {
  return {
    ticker: item.ticker,
    assetName: item.assetName ?? null,
    reason,
    context,
  }
}

function classifyOne(item: CapitalOpportunityInput):
  | { visible: CapitalAllocationItem; hidden?: never; relevance: number }
  | { visible?: never; hidden: CapitalHiddenItem; relevance: number } {
  const conviction = normaliseConviction(item.convictionLevel)

  if (conviction === 'CORE_HOLD') {
    return {
      hidden: hidden(item, 'core_hold', 'Position centrale : aucun arbitrage proposé'),
      relevance: 0,
    }
  }

  if (!hasRealStrategicSignal(item, conviction)) {
    return {
      hidden: hidden(item, 'not_priority_now', 'Opportunité non prioritaire actuellement'),
      relevance: 0,
    }
  }

  if (conviction === 'EXIT_ON_RALLY' || conviction === 'TRIM_ON_RALLY' || conviction === 'EXIT_NOW') {
    return {
      visible: baseItem(
        item,
        'exit_watch',
        'À surveiller pour sortie',
        'Jamais achat : surveillance de sortie uniquement',
        'watch_exit',
        'avoid_buy',
      ),
      relevance: 1,
    }
  }

  if (item.sectorRoom === 'saturated' && conviction === 'NEUTRAL') {
    return {
      hidden: hidden(item, 'sector_saturated', 'Secteur déjà fortement exposé'),
      relevance: 0,
    }
  }

  if (conviction === 'STRONG_BUY') {
    const overweight = item.weightState === 'overweight'
    const extended = item.priceQuality === 'extended'
    const noCapital = item.capitalAvailable === false
    const reinforcementConditionMet =
      item.signalQuality === 'strong' &&
      item.drawdownPct != null &&
      Number.isFinite(item.drawdownPct) &&
      item.drawdownPct <= -8
    const context = overweight
      ? 'Surpondération acceptée, achat encore déconseillé'
      : extended
        ? 'Prix encore trop élevé pour votre stratégie'
        : noCapital
          ? 'Capital disponible insuffisant pour prioriser maintenant'
          : reinforcementConditionMet
            ? 'Condition de renfort atteinte'
            : 'Condition de renfort non atteinte'
    return {
      visible: baseItem(
        item,
        'strategic_reinforcement',
        'Renforcement suivant plan stratégique',
        context,
        reinforcementConditionMet && !overweight && !extended && !noCapital ? 'prepare' : 'wait',
        reinforcementConditionMet && !overweight && !extended && !noCapital ? 'candidate' : 'deferred',
      ),
      relevance: 0.9,
    }
  }

  if (conviction === 'BUY_DIPS') {
    if (!hasEnoughWeakness(item)) {
      return {
        hidden: hidden(item, 'dip_not_deep_enough', 'Faiblesse encore insuffisante'),
        relevance: 0,
      }
    }
    return {
      visible: baseItem(
        item,
        'buy_the_dip',
        'Achat sur repli',
        'Condition de repli atteinte',
        'prepare',
        'candidate',
      ),
      relevance: 0.8,
    }
  }

  const relevance = personalCapitalRelevance(item)
  if (!hasSolidPriorityInputs(item)) {
    return {
      hidden: hidden(item, 'not_priority_now', 'Opportunité non prioritaire actuellement'),
      relevance,
    }
  }
  if (item.sectorRoom === 'saturated') {
    return {
      hidden: hidden(item, 'sector_saturated', 'Secteur déjà fortement exposé'),
      relevance,
    }
  }
  if (relevance < 0.62 || item.accountRouting === 'blocked') {
    return {
      hidden: hidden(item, 'not_priority_now', 'Opportunité non prioritaire actuellement'),
      relevance,
    }
  }

  return {
    visible: baseItem(
      item,
      'priority_new_opportunities',
      'Nouvelles opportunités prioritaires',
      'Meilleure utilisation potentielle du capital disponible',
      'prepare',
      'candidate',
    ),
    relevance,
  }
}

export function buildCapitalAllocationIntelligence(
  inputs: CapitalOpportunityInput[],
): CapitalAllocationResult {
  const buckets = new Map<CapitalSectionKey, CapitalSortableItem[]>()
  const hiddenItems: CapitalHiddenItem[] = []

  for (const input of inputs) {
    const classified = classifyOne(input)
    if (classified.visible) {
      const list = buckets.get(classified.visible.section) ?? []
      list.push({
        ...classified.visible,
        relevance: classified.relevance,
        sourceRank: input.sourceRank,
        sourceScore: input.sourceScore,
        sourceTier: input.sourceTier,
      })
      buckets.set(classified.visible.section, list)
    } else {
      hiddenItems.push(classified.hidden)
    }
  }

  return {
    sections: SECTION_ORDER.map((key) => ({
      key,
      title: SECTION_TITLES[key],
      items: (buckets.get(key) ?? [])
        .sort(compareAllocationItems)
        .map(({
          relevance: _relevance,
          sourceRank: _sourceRank,
          sourceScore: _sourceScore,
          sourceTier: _sourceTier,
          ...item
        }) => item),
    })),
    hidden: hiddenItems,
  }
}
