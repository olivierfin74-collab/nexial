import { ControlSurface } from '@/components/control/ControlSurface'
import {
  getAlertQualityKpis,
  getControlCenterSummary,
  getCronsRecentRuns,
  getDataFreshness,
  getDivergenceKpis,
  getEngineHealth,
  getRecentAdrs,
} from '@/lib/control/queries'

type ControlDebugLabel =
  | 'SUMMARY'
  | 'BLOCK_A'
  | 'BLOCK_B'
  | 'BLOCK_C'
  | 'BLOCK_D'
  | 'BLOCK_E'
  | 'BLOCK_F'

type ControlBlockErrors = Partial<Record<ControlDebugLabel, string>>

async function safeControlQuery<T>(
  label: ControlDebugLabel,
  query: () => Promise<T>,
  fallback: T,
  errors: ControlBlockErrors,
): Promise<T> {
  try {
    return await query()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    errors[label] = message
    console.error(`[CONTROL][${label}] query unavailable`, error)
    return fallback
  }
}

// Read-only V1. Server Component qui agrège les 7 vues nx.* en parallèle
// puis délègue le rendu à ControlSurface. Aucun cache : on lit la version
// courante à chaque request (le refresh manuel passe par router.refresh()).
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ControlPage() {
  const blockErrors: ControlBlockErrors = {}
  const [summary, engine, freshnessSet, runs, divergence, alertQuality, adrs] = await Promise.all([
    safeControlQuery('SUMMARY', getControlCenterSummary, null, blockErrors),
    safeControlQuery('BLOCK_A', getEngineHealth, null, blockErrors),
    safeControlQuery(
      'BLOCK_B',
      getDataFreshness,
      { freshness: [], market: [] },
      blockErrors,
    ),
    safeControlQuery('BLOCK_C', () => getCronsRecentRuns(100), [], blockErrors),
    safeControlQuery('BLOCK_D', getDivergenceKpis, null, blockErrors),
    safeControlQuery('BLOCK_E', getAlertQualityKpis, null, blockErrors),
    safeControlQuery('BLOCK_F', () => getRecentAdrs(8), [], blockErrors),
  ])

  return (
    <ControlSurface
      summary={summary}
      engine={engine}
      freshness={freshnessSet.freshness}
      market={freshnessSet.market}
      runs={runs}
      divergence={divergence}
      alertQuality={alertQuality}
      adrs={adrs}
      now={new Date()}
      blockErrors={blockErrors}
    />
  )
}
