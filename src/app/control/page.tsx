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

// Read-only V1. Server Component qui agrège les 7 vues nx.* en parallèle
// puis délègue le rendu à ControlSurface. Aucun cache : on lit la version
// courante à chaque request (le refresh manuel passe par router.refresh()).
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ControlPage() {
  const [summary, engine, freshnessSet, runs, divergence, alertQuality, adrs] = await Promise.all([
    getControlCenterSummary(),
    getEngineHealth(),
    getDataFreshness(),
    getCronsRecentRuns(100),
    getDivergenceKpis(),
    getAlertQualityKpis(),
    getRecentAdrs(8),
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
    />
  )
}
