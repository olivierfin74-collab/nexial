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

type ControlDebugLabel =
  | 'SUMMARY'
  | 'BLOCK_A'
  | 'BLOCK_B'
  | 'BLOCK_C'
  | 'BLOCK_D'
  | 'BLOCK_E'
  | 'BLOCK_F'

type ControlBlockErrors = Partial<Record<ControlDebugLabel, string>>

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
  blockErrors?: ControlBlockErrors
}

export function ControlSurface(props: ControlSurfaceProps) {
  const {
    summary,
    engine,
    freshness,
    market,
    runs,
    divergence,
    alertQuality,
    adrs,
    now,
    blockErrors = {},
  } = props
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
        {blockErrors.SUMMARY ? (
          <UnavailableBlock letter="S" title="Synthèse" error={blockErrors.SUMMARY} />
        ) : (
          <StatusGlobal summary={summary} now={now} />
        )}
        <div style={stack}>
          {blockErrors.BLOCK_A ? (
            <UnavailableBlock letter="A" title="Moteur" error={blockErrors.BLOCK_A} />
          ) : (
            <EngineBlock data={engine} />
          )}
          {blockErrors.BLOCK_B ? (
            <UnavailableBlock letter="B" title="Données" error={blockErrors.BLOCK_B} />
          ) : (
            <DataBlock
              freshness={freshness}
              market={market}
              criticalStaleAssets={summary?.critical_stale_assets}
              warnStaleAssets={summary?.warn_stale_assets}
            />
          )}
          {blockErrors.BLOCK_C ? (
            <UnavailableBlock letter="C" title="Tâches planifiées" error={blockErrors.BLOCK_C} />
          ) : (
            <CronsBlock
              runs={runs}
              cronsActive={summary?.crons_total_active}
              intradayActive={summary?.intraday_active}
              eodActive={summary?.eod_active}
              now={now}
            />
          )}
          {blockErrors.BLOCK_D ? (
            <UnavailableBlock letter="D" title="Divergences" error={blockErrors.BLOCK_D} />
          ) : (
            <DivergenceBlock data={divergence} now={now} />
          )}
          {blockErrors.BLOCK_E ? (
            <UnavailableBlock letter="E" title="Qualité alertes" error={blockErrors.BLOCK_E} />
          ) : (
            <AlertQualityBlock data={alertQuality} />
          )}
          {blockErrors.BLOCK_F ? (
            <UnavailableBlock letter="F" title="Décisions doctrine" error={blockErrors.BLOCK_F} />
          ) : (
            <AdrFeedBlock adrs={adrs} now={now} />
          )}
        </div>
      </main>
    </div>
  )
}

function UnavailableBlock({
  letter,
  title,
  error,
}: {
  letter: string
  title: string
  error: string
}) {
  return (
    <section data-block={letter} style={unavailableBlock}>
      <div style={unavailableHeader}>
        <span style={unavailableLetter}>{letter}</span>
        <span style={unavailableTitle}>{title}</span>
        <span style={unavailableStatus}>Bloc indisponible</span>
      </div>
      <p style={unavailableError}>{error}</p>
    </section>
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

const unavailableBlock: CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: '12px 14px',
}

const unavailableHeader: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const unavailableLetter: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--gold)',
  letterSpacing: '0.08em',
  minWidth: 16,
}

const unavailableTitle: CSSProperties = {
  fontFamily: 'var(--font-editorial-serif)',
  fontSize: 16,
  fontWeight: 600,
  color: 'var(--ink-primary)',
  flex: '1 1 auto',
}

const unavailableStatus: CSSProperties = {
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10,
  color: 'var(--ink-tertiary)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
}

const unavailableError: CSSProperties = {
  margin: '8px 0 0 28px',
  fontFamily: 'var(--font-editorial-mono)',
  fontSize: 10.5,
  lineHeight: 1.4,
  color: 'var(--ink-tertiary)',
  wordBreak: 'break-word',
}
