export type RiskProfile = 'prudent' | 'equilibre' | 'dynamique' | 'offensif'
export type AccountPreference = 'AUTO' | 'PEA' | 'CTO'

export type MarketOpportunity = {
  asset_name: string
  ticker: string | null
  account_name?: string | null
  asset_type?: string | null
  score?: number
  weight?: number
  unrealized_pnl_pct?: number | null
  market_value?: number | null
  preference_type?: string | null
  target_weight?: number | null
  max_weight?: number | null
}

export type InvestmentInput = {
  amount: number
  riskProfile: RiskProfile
  targetReturn: number
  horizonMonths: number
  accountPreference: AccountPreference
}

export type InvestmentProposal = {
  asset: string
  ticker: string
  account: string
  suggestedAmount: number
  suggestedWeight: number
  score: number
  reason: string
}

export type InvestmentPlan = {
  investNowAmount: number
  keepCashAmount: number
  posture: 'deploy' | 'partial' | 'wait'
  summary: string
  proposals: InvestmentProposal[]
}

export function buildInvestmentPlan(
  input: InvestmentInput,
  opportunities: MarketOpportunity[]
): InvestmentPlan {
  const amount = Math.max(0, input.amount)

  if (amount === 0) {
    return {
      investNowAmount: 0,
      keepCashAmount: 0,
      posture: 'wait',
      summary: 'Montant nul : aucun investissement proposé.',
      proposals: [],
    }
  }

  const compatible = opportunities
    .filter((o) => filterByAccountPreference(o, input.accountPreference))
    .filter((o) => filterByRisk(o, input.riskProfile))
    .filter((o) => (o.score ?? 0) >= minimumScore(input))
    .filter((o) => {
      if (o.preference_type === 'EXCLUDE') return false
      if (o.target_weight != null) return (o.weight ?? 0) < o.target_weight
      return true
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3)

  if (compatible.length === 0) {
    return {
      investNowAmount: 0,
      keepCashAmount: amount,
      posture: 'wait',
      summary:
        'Aucune opportunité assez forte selon les critères et préférences actuels. Conserver le cash en attente.',
      proposals: [],
    }
  }

  const deployRatio = getDeployRatio(input)
  const investNowAmount = round(amount * deployRatio)
  const keepCashAmount = round(amount - investNowAmount)

  if (investNowAmount <= 0) {
    return {
      investNowAmount: 0,
      keepCashAmount: amount,
      posture: 'wait',
      summary:
        'Contexte trop peu favorable pour investir maintenant. Mieux vaut attendre.',
      proposals: [],
    }
  }

  const weights = getProposalWeights(compatible.length, input.riskProfile)
  const proposals = compatible.map((o, index) => {
    const suggestedAmount = round(investNowAmount * weights[index])
    return {
      asset: o.asset_name,
      ticker: o.ticker ?? '-',
      account: resolveAccount(o, input.accountPreference),
      suggestedAmount,
      suggestedWeight: round(weights[index] * 100),
      score: round(o.score ?? 0),
      reason: buildProposalReason(o, input),
    }
  })

  return {
    investNowAmount,
    keepCashAmount,
    posture: deployRatio >= 0.9 ? 'deploy' : deployRatio >= 0.4 ? 'partial' : 'wait',
    summary: buildSummary(input, investNowAmount, keepCashAmount, proposals.length),
    proposals,
  }
}

function filterByAccountPreference(
  o: MarketOpportunity,
  pref: AccountPreference
) {
  if (pref === 'AUTO') return true
  if (pref === 'PEA') return (o.account_name ?? '').toUpperCase().includes('PEA')
  if (pref === 'CTO') return (o.account_name ?? '').toUpperCase().includes('CTO')
  return true
}

function filterByRisk(o: MarketOpportunity, risk: RiskProfile) {
  const score = o.score ?? 0
  const perf = o.unrealized_pnl_pct ?? 0

  if (risk === 'prudent') {
    return score >= 6.5 && perf >= 0 && (o.asset_type === 'ETF' || score >= 7)
  }

  if (risk === 'equilibre') return score >= 6
  if (risk === 'dynamique') return score >= 5.8
  return score >= 5.5
}

function minimumScore(input: InvestmentInput) {
  if (input.horizonMonths <= 3) return 6.8
  if (input.horizonMonths <= 12) return 6.2
  return 5.8
}

function getDeployRatio(input: InvestmentInput) {
  const aggressiveTarget = input.targetReturn >= 12 && input.horizonMonths <= 6

  if (input.riskProfile === 'prudent') return 0.4
  if (input.riskProfile === 'equilibre') return aggressiveTarget ? 0.55 : 0.7
  if (input.riskProfile === 'dynamique') return aggressiveTarget ? 0.7 : 0.85
  return aggressiveTarget ? 0.85 : 1
}

function getProposalWeights(count: number, risk: RiskProfile) {
  if (count === 1) return [1]
  if (count === 2) return risk === 'prudent' ? [0.6, 0.4] : [0.55, 0.45]
  return risk === 'prudent' ? [0.5, 0.3, 0.2] : [0.45, 0.35, 0.2]
}

function resolveAccount(
  o: MarketOpportunity,
  pref: AccountPreference
) {
  if (pref !== 'AUTO') return pref
  return o.account_name ?? '-'
}

function buildProposalReason(
  o: MarketOpportunity,
  input: InvestmentInput
) {
  if (o.preference_type === 'OVERWEIGHT' && o.target_weight != null) {
    return `Surpondération choisie par l’utilisateur. Poids actuel ${round(
      o.weight ?? 0
    )}% sous la cible ${round(o.target_weight)}%.`
  }

  if ((o.weight ?? 0) < 5 && (o.score ?? 0) >= 7) {
    return 'Sous-pondéré avec bon score, priorité naturelle pour renforcer la ligne.'
  }

  if (input.horizonMonths >= 24 && o.asset_type === 'ETF') {
    return 'Actif cohérent avec un horizon long et un déploiement discipliné.'
  }

  return 'Profil rendement/risque compatible avec les paramètres d’investissement saisis.'
}

function buildSummary(
  input: InvestmentInput,
  investNowAmount: number,
  keepCashAmount: number,
  proposalCount: number
) {
  if (proposalCount === 0) {
    return 'Aucune allocation proposée.'
  }

  if (keepCashAmount > 0) {
    return `Investir ${round(investNowAmount)} € maintenant et conserver ${round(
      keepCashAmount
    )} € en réserve. Plan adapté à un profil ${input.riskProfile} sur ${input.horizonMonths} mois.`
  }

  return `Déployer ${round(
    investNowAmount
  )} € immédiatement sur ${proposalCount} opportunité(s), en cohérence avec le profil ${input.riskProfile}.`
}

function round(value: number) {
  return Math.round(value * 100) / 100
}