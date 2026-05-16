// Opportunity Quality V1.1.
//
// Pure TypeScript layer only: standard state + user thesis in,
// adjusted verdict out. No fetch, no UI wording outside this file,
// no scoring and no allocation-engine dependency.

export type OpportunityConvictionLevel =
  | 'CORE_HOLD'
  | 'STRONG_BUY'
  | 'BUY_DIPS'
  | 'EXIT_ON_RALLY'
  | 'NEUTRAL'

export type OpportunityStandardIntent =
  | 'buy'
  | 'reinforce'
  | 'hold'
  | 'watch'
  | 'trim'
  | 'exit'
  | 'none'

export type AdjustedVerdict =
  | 'standard_applied'
  | 'strategic_buy'
  | 'strategic_reinforcement'
  | 'wait_for_condition'
  | 'avoid_buy'
  | 'strategic_exit'
  | 'filtered'

export type AdjustedSectionHint =
  | 'standard'
  | 'strategic_buy'
  | 'strategic_reinforcement'
  | 'wait'
  | 'avoid_buy'
  | 'exit'
  | 'silent'

export type AdjustVerdictReason =
  | 'Renforcement suivant plan stratégique'
  | 'Achat suivant plan stratégique'
  | 'Surpondération acceptée, achat encore déconseillé'
  | 'Condition de renfort non atteinte'
  | 'Sortie suivant plan stratégique'
  | 'Position centrale : aucun arbitrage proposé'
  | 'Aucune stratégie avancée définie : règle standard appliquée'

export interface StandardOpportunityState {
  standardVerdict?: string | null
  standardLabel?: string | null
  standardIntent?: OpportunityStandardIntent | null
  isHeld?: boolean | null
  isOverweight?: boolean | null
  opportunityAcceptable?: boolean | null
  conditionMet?: boolean | null
}

export interface UserOpportunityThesis {
  conviction_level?: string | null
}

export interface AdjustVerdictResult {
  finalVerdict: AdjustedVerdict | string
  finalLabel: AdjustVerdictReason
  reason: AdjustVerdictReason
  sectionHint: AdjustedSectionHint
  shouldDisplay: boolean
  isFiltered: boolean
}

const STANDARD_REASON: AdjustVerdictReason =
  'Aucune stratégie avancée définie : règle standard appliquée'

function normalizeConviction(value: string | null | undefined): OpportunityConvictionLevel {
  switch (value) {
    case 'CORE_HOLD':
    case 'STRONG_BUY':
    case 'BUY_DIPS':
    case 'EXIT_ON_RALLY':
    case 'NEUTRAL':
      return value
    default:
      return 'NEUTRAL'
  }
}

function hasExplicitAcceptableOpportunity(state: StandardOpportunityState): boolean {
  return state.opportunityAcceptable === true || state.conditionMet === true
}

function isBuyIntent(intent: OpportunityStandardIntent | null | undefined): boolean {
  return intent === 'buy' || intent === 'reinforce'
}

function isTrimIntent(intent: OpportunityStandardIntent | null | undefined): boolean {
  return intent === 'trim' || intent === 'exit'
}

function standardResult(state: StandardOpportunityState): AdjustVerdictResult {
  return {
    finalVerdict: state.standardVerdict ?? 'standard_applied',
    finalLabel: STANDARD_REASON,
    reason: STANDARD_REASON,
    sectionHint: 'standard',
    shouldDisplay: true,
    isFiltered: false,
  }
}

export function adjustVerdict(
  standardState: StandardOpportunityState,
  userThesis: UserOpportunityThesis | null | undefined,
): AdjustVerdictResult {
  const conviction = normalizeConviction(userThesis?.conviction_level)

  if (conviction === 'NEUTRAL') {
    return standardResult(standardState)
  }

  if (conviction === 'EXIT_ON_RALLY') {
    return {
      finalVerdict: 'strategic_exit',
      finalLabel: 'Sortie suivant plan stratégique',
      reason: 'Sortie suivant plan stratégique',
      sectionHint: 'exit',
      shouldDisplay: true,
      isFiltered: false,
    }
  }

  if (conviction === 'CORE_HOLD') {
    if (standardState.isOverweight === true && isBuyIntent(standardState.standardIntent)) {
      return {
        finalVerdict: 'avoid_buy',
        finalLabel: 'Surpondération acceptée, achat encore déconseillé',
        reason: 'Surpondération acceptée, achat encore déconseillé',
        sectionHint: 'avoid_buy',
        shouldDisplay: true,
        isFiltered: false,
      }
    }

    if (isTrimIntent(standardState.standardIntent)) {
      return {
        finalVerdict: 'filtered',
        finalLabel: 'Position centrale : aucun arbitrage proposé',
        reason: 'Position centrale : aucun arbitrage proposé',
        sectionHint: 'silent',
        shouldDisplay: false,
        isFiltered: true,
      }
    }

    return {
      finalVerdict: 'filtered',
      finalLabel: 'Position centrale : aucun arbitrage proposé',
      reason: 'Position centrale : aucun arbitrage proposé',
      sectionHint: 'silent',
      shouldDisplay: false,
      isFiltered: true,
    }
  }

  if (conviction === 'STRONG_BUY' || conviction === 'BUY_DIPS') {
    if (!hasExplicitAcceptableOpportunity(standardState)) {
      return {
        finalVerdict: 'wait_for_condition',
        finalLabel: 'Condition de renfort non atteinte',
        reason: 'Condition de renfort non atteinte',
        sectionHint: 'wait',
        shouldDisplay: true,
        isFiltered: false,
      }
    }

    const isHeld = standardState.isHeld === true
    return {
      finalVerdict: isHeld ? 'strategic_reinforcement' : 'strategic_buy',
      finalLabel: isHeld
        ? 'Renforcement suivant plan stratégique'
        : 'Achat suivant plan stratégique',
      reason: isHeld
        ? 'Renforcement suivant plan stratégique'
        : 'Achat suivant plan stratégique',
      sectionHint: isHeld ? 'strategic_reinforcement' : 'strategic_buy',
      shouldDisplay: true,
      isFiltered: false,
    }
  }

  return standardResult(standardState)
}

export const ADJUST_VERDICT_INTERNAL_CASES = [
  {
    name: 'asset sans these',
    result: adjustVerdict({ standardVerdict: 'standard' }, null).reason,
  },
  {
    name: 'STRONG_BUY prix OK',
    result: adjustVerdict(
      { isHeld: true, opportunityAcceptable: true },
      { conviction_level: 'STRONG_BUY' },
    ).reason,
  },
  {
    name: 'STRONG_BUY prix non OK',
    result: adjustVerdict(
      { isHeld: true, opportunityAcceptable: false },
      { conviction_level: 'STRONG_BUY' },
    ).reason,
  },
  {
    name: 'CORE_HOLD trim',
    result: adjustVerdict(
      { standardIntent: 'trim' },
      { conviction_level: 'CORE_HOLD' },
    ).reason,
  },
  {
    name: 'EXIT_ON_RALLY',
    result: adjustVerdict({}, { conviction_level: 'EXIT_ON_RALLY' }).reason,
  },
  {
    name: 'conviction inconnue',
    result: adjustVerdict({}, { conviction_level: 'UNKNOWN' }).reason,
  },
] as const
