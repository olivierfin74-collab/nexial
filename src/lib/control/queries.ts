// Lectures Supabase pour /control. Server Components only.
// Aucune mutation autorisée (G4 + G11). Toutes les vues sont en schéma `nx`,
// exposé via PostgREST (cf. utilisation existante dans
// src/app/api/settings/route.ts pour `vw_olivier_daily_review`).

import { createClient } from '@/lib/supabase/server'
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

export async function getControlCenterSummary(): Promise<ControlCenterSummary | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vw_control_center_summary')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_control_center_summary: ${error.message}`)
  return (data as ControlCenterSummary | null) ?? null
}

export async function getEngineHealth(): Promise<EngineHealthCalibrated | null> {
  const supabase = await createClient()
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
  const supabase = await createClient()
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
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cron_run_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`cron_run_log: ${error.message}`)
  return (data as CronRunLogRow[] | null) ?? []
}

export async function getDivergenceKpis(): Promise<DivergenceTrackingKpis | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vw_divergence_tracking_kpis')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_divergence_tracking_kpis: ${error.message}`)
  return (data as DivergenceTrackingKpis | null) ?? null
}

export async function getAlertQualityKpis(): Promise<AlertQualityKpis | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vw_alert_quality_kpis')
    .select('*')
    .maybeSingle()
  if (error) throw new Error(`vw_alert_quality_kpis: ${error.message}`)
  return (data as AlertQualityKpis | null) ?? null
}

export async function getRecentAdrs(limit = 10): Promise<ArchitectureDecisionRow[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('architecture_decisions')
    .select('decision_number, title, status, decided_at, metadata')
    .order('decided_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`architecture_decisions: ${error.message}`)
  return (data as ArchitectureDecisionRow[] | null) ?? []
}
