// Read-only Supabase queries for /control. Server Components only.
// All control objects live in the nx schema; no mutation is allowed here.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type {
  AlertQualityKpis,
  ArchitectureDecisionRow,
  ControlCenterSummary,
  CronRunLogRow,
  DataFreshnessAlert,
  DivergenceTrackingKpis,
  EngineHealthCalibrated,
  MarketFreshness,
} from './types'

async function createControlClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      db: { schema: 'nx' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot always set cookies directly.
          }
        },
      },
    },
  )
}

export async function getControlCenterSummary(): Promise<ControlCenterSummary | null> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_control_center_summary')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_control_center_summary: ${error.message}`)
  return (data as ControlCenterSummary | null) ?? null
}

export async function getEngineHealth(): Promise<EngineHealthCalibrated | null> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_engine_health_calibrated_v1')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_engine_health_calibrated_v1: ${error.message}`)
  return (data as EngineHealthCalibrated | null) ?? null
}

export async function getDataFreshness(): Promise<{
  freshness: DataFreshnessAlert[]
  market: MarketFreshness[]
}> {
  const supabase = await createControlClient()
  const [freshness, market] = await Promise.all([
    supabase.from('vw_data_freshness_alerts').select('*'),
    supabase.from('vw_market_freshness').select('*'),
  ])
  if (freshness.error) throw new Error(`vw_data_freshness_alerts: ${freshness.error.message}`)
  if (market.error) throw new Error(`vw_market_freshness: ${market.error.message}`)
  return {
    freshness: (freshness.data as DataFreshnessAlert[] | null) ?? [],
    market: (market.data as MarketFreshness[] | null) ?? [],
  }
}

export async function getCronsRecentRuns(limit = 50): Promise<CronRunLogRow[]> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('cron_run_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`cron_run_log: ${error.message}`)
  return (data as CronRunLogRow[] | null) ?? []
}

export async function getDivergenceKpis(): Promise<DivergenceTrackingKpis | null> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_divergence_tracking_kpis')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_divergence_tracking_kpis: ${error.message}`)
  return (data as DivergenceTrackingKpis | null) ?? null
}

export async function getAlertQualityKpis(): Promise<AlertQualityKpis | null> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_alert_quality_kpis')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_alert_quality_kpis: ${error.message}`)
  return (data as AlertQualityKpis | null) ?? null
}

export async function getRecentAdrs(limit = 10): Promise<ArchitectureDecisionRow[]> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('architecture_decisions')
    .select('decision_number, title, status, decided_at, metadata')
    .order('decided_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`architecture_decisions: ${error.message}`)
  return (data as ArchitectureDecisionRow[] | null) ?? []
}
