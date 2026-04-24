export type EnrichedPosition = {
  asset_name: string
  ticker: string | null
  asset_type?: string | null
  account_name?: string | null
  market_value?: number | null
  unrealized_pnl_pct?: number | null
  weight?: number
  score?: number

  preference_type?: string | null
  target_weight?: number | null
  max_weight?: number | null
}

export type Opportunity = {
  asset: string
  ticker: string
  account: string
  score: number
  weight: number
  perfPct: number
  priority: number
  reason: string
}

export type Arbitrage = {
  action: 'TRIM' | 'ARBITRATE'
  asset: string
  ticker: string
  account: string
  score: number
  weight: number
  perfPct: number
  priority: number
  reason: string
}

export type RecommendationPack = {
  opportunities: Opportunity[]
  arbitrages: Arbitrage[]
  plan: string
}

export function buildRecommendations(
  positions: EnrichedPosition[]
): RecommendationPack {
  const normalized = positions.map((p) => {
    const score = p.score ?? 0
    const weight = p.weight ?? 0
    const perfPct = p.unrealized_pnl_pct ?? 0
    const pref = p.preference_type ?? 'NEUTRAL'
    const targetWeight = p.target_weight ?? null
    const maxWeight = p.max_weight ?? null

    const opportunityPriority =
      score * 1.4 +
      Math.max(0, (targetWeight ?? 10) - weight) * 1.1 +
      Math.max(0, perfPct) * 0.2 -
      Math.max(0, perfPct - 20) * 0.3 +
      (pref === 'OVERWEIGHT' ? 1.2 : 0)

    const arbitragePriority =
      Math.max(0, weight - (maxWeight ?? 20)) * 1.4 +
      Math.max(0, 6 - score) * 1.5 +
      Math.max(0, perfPct - 15) * 0.15

    return {
      ...p,
      score,
      weight,
      perfPct,
      pref,
      targetWeight,
      maxWeight,
      opportunityPriority,
      arbitragePriority,
    }
  })

  const opportunities: Opportunity[] = normalized
    .filter((p) => {
      if (p.pref === 'EXCLUDE') return false
      if (p.score < 6) return false
      if (p.perfPct < 0) return false

      if (p.targetWeight != null) {
        return p.weight < p.targetWeight
      }

      return p.weight < 12
    })
    .sort((a, b) => b.opportunityPriority - a.opportunityPriority)
    .slice(0, 3)
    .map((p) => ({
      asset: p.asset_name,
      ticker: p.ticker ?? '-',
      account: p.account_name ?? '-',
      score: round(p.score),
      weight: round(p.weight),
      perfPct: round(p.perfPct),
      priority: round(p.opportunityPriority),
      reason: buildOpportunityReason(p),
    }))

  const arbitrages: Arbitrage[] = normalized
    .filter((p) => {
      if (p.pref === 'EXCLUDE') return true
      if (p.score < 5.5) return true
      if (p.maxWeight != null) return p.weight > p.maxWeight
      return p.weight > 25
    })
    .sort((a, b) => b.arbitragePriority - a.arbitragePriority)
    .slice(0, 3)
    .map((p) => ({
      action: p.pref === 'EXCLUDE' || p.score < 5.5 ? 'ARBITRATE' : 'TRIM',
      asset: p.asset_name,
      ticker: p.ticker ?? '-',
      account: p.account_name ?? '-',
      score: round(p.score),
      weight: round(p.weight),
      perfPct: round(p.perfPct),
      priority: round(p.arbitragePriority),
      reason: buildArbitrageReason(p),
    }))

  const plan = buildActionPlan(opportunities, arbitrages)

  return {
    opportunities,
    arbitrages,
    plan,
  }
}

function buildOpportunityReason(p: any) {
  if (p.preference_type === 'OVERWEIGHT' && p.targetWeight != null) {
    return `Actif à surpondérer par choix utilisateur. Poids actuel ${round(
      p.weight
    )}% sous la cible ${round(p.targetWeight)}%.`
  }

  if (p.weight < 5 && p.score >= 7) {
    return 'Sous-pondéré avec bon score global, renforcement prioritaire.'
  }

  if (p.perfPct > 0 && p.perfPct < 12 && p.score >= 6.5) {
    return 'Momentum sain sans excès, bon candidat pour un déploiement progressif.'
  }

  return 'Profil rendement/risque compatible avec un renforcement.'
}

function buildArbitrageReason(p: any) {
  if (p.preference_type === 'EXCLUDE') {
    return 'Actif explicitement exclu par préférence utilisateur.'
  }

  if (p.maxWeight != null && p.weight > p.maxWeight) {
    return `Poids actuel ${round(p.weight)}% au-dessus du maximum autorisé ${round(
      p.maxWeight
    )}%.`
  }

  if (p.score < 5.5) {
    return 'Score relatif trop faible, capital potentiellement mieux employé ailleurs.'
  }

  return 'Arbitrage défensif conseillé.'
}

function buildActionPlan(
  opportunities: Opportunity[],
  arbitrages: Arbitrage[]
) {
  if (opportunities.length === 0 && arbitrages.length === 0) {
    return 'Aucune action prioritaire : le portefeuille reste cohérent avec les préférences utilisateur.'
  }

  if (opportunities.length > 0 && arbitrages.length === 0) {
    return 'Déployer le cash en priorité sur les opportunités alignées avec les surpondérations voulues.'
  }

  if (opportunities.length === 0 && arbitrages.length > 0) {
    return 'Réduire d’abord les positions hors cadre ou au-dessus de leur limite personnalisée.'
  }

  return 'Réallouer depuis les lignes excessives vers les actifs à surpondérer validés par la stratégie utilisateur.'
}

function round(value: number) {
  return Math.round(value * 100) / 100
}