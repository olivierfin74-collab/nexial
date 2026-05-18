import type { CSSProperties } from 'react'
import { ControlHeader } from './ControlHeader'
import { StatusGlobal } from './StatusGlobal'
import { EngineBlock } from './blocks/EngineBlock'
import { DataBlock } from './blocks/DataBlock'
import { CronsBlock } from './blocks/CronsBlock'
import { DivergenceBlock } from './blocks/DivergenceBlock'
import { AlertQualityBlock } from './blocks/AlertQualityBlock'
import { AdrFeedBlock } from './blocks/AdrFeedBlock'
import type {
  AlertQualityKpis,
  ArchitectureDecisionRow,
  ControlCenterSummary,
  CronRunLogRow,
  DataFreshnessAlert,
  DivergenceTrackingKpis,
  EngineHealthCalibrated,
  MarketFreshness,
} from '@/lib/control/types'

interface ControlSurfaceProps {
  summary: ControlCenterSummary | null
  engine: EngineHealthCalibrated | null
  freshness: DataFreshnessAlert[]
  market: MarketFreshness[]
  runs: CronRunLogRow[]
  divergence: DivergenceTrackingKpis | null
  alertQuality: AlertQualityKpis | null
  adrs: ArchitectureDecisionRow[]
  now: Date
}

export function ControlSurface(props: ControlSurfaceProps) {
  const { summary, engine, freshness, market, runs, divergence, alertQuality, adrs, now } = props
  return (
    <div
      data-shell="ControlSurface"
      style={{
        minHeight: '100vh',
        background: 'var(--canvas)',
        color: 'var(--ink-primary)',
        paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
      }}
    >
      <ControlHeader now={now} />
      <main style={surface}>
        <StatusGlobal summary={summary} now={now} />
        <div style={stack}>
          <EngineBlock data={engine} />
          <DataBlock
            freshness={freshness}
            market={market}
            criticalStaleAssets={summary?.critical_stale_assets}
            warnStaleAssets={summary?.warn_stale_assets}
          />
          <CronsBlock
            runs={runs}
            cronsActive={summary?.crons_total_active}
            intradayActive={summary?.intraday_active}
            eodActive={summary?.eod_active}
            now={now}
          />
          <DivergenceBlock data={divergence} now={now} />
          <AlertQualityBlock data={alertQuality} />
          <AdrFeedBlock adrs={adrs} now={now} />
        </div>
      </main>
    </div>
  )
}

const surface: CSSProperties = {
  maxWidth: 560,
  margin: '0 auto',
  padding: '14px 16px 24px',
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
}

const stack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
}
