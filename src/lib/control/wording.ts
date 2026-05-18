import type { ControlStatus } from './types'

export const statusLabels: Record<ControlStatus, string> = {
  HEALTHY: 'Système sain',
  DEGRADED: 'À surveiller',
  CRITICAL: 'Action requise',
  BOOTSTRAPPING: 'Données en cours',
  NEUTRAL: '—',
}

export const blockLabels = {
  engine: 'Moteur',
  data: 'Données',
  crons: 'Tâches planifiées',
  divergence: 'Divergences',
  alertQuality: 'Qualité alertes',
  adrFeed: 'Décisions doctrine',
} as const

// Backend renvoie plusieurs vocabulaires de status. On les ramène
// à 5 valeurs canoniques pour l'UI (StatusPill, mapping calme).
// - engine_status / global_status : HEALTHY | DEGRADED | CRITICAL | BOOTSTRAPPING
// - divergence_status : "BOOTSTRAPPING — N décisions…" (prefix enum)
// - alert_quality_status : HIGH_QUALITY | MEDIUM_QUALITY | LOW_QUALITY
// - freshness_status : OK | WARN | CRITICAL (ou variantes)
// Tout ce qui ne matche pas → NEUTRAL pour rester calme par défaut (G8).
export function normalizeStatus(raw: string | null | undefined): ControlStatus {
  if (!raw) return 'NEUTRAL'
  const prefix = raw.trim().split(/[\s—–-]+/)[0].toUpperCase()
  if (prefix === 'HEALTHY' || prefix === 'OK' || prefix === 'HIGH_QUALITY' || prefix === 'HIGH' || prefix === 'GREEN') return 'HEALTHY'
  if (prefix === 'DEGRADED' || prefix === 'WARN' || prefix === 'WARNING' || prefix === 'MEDIUM_QUALITY' || prefix === 'MEDIUM' || prefix === 'AMBER' || prefix === 'YELLOW') return 'DEGRADED'
  if (prefix === 'CRITICAL' || prefix === 'BROKEN' || prefix === 'LOW_QUALITY' || prefix === 'LOW' || prefix === 'RED') return 'CRITICAL'
  if (prefix === 'BOOTSTRAPPING' || prefix === 'BOOTSTRAP' || prefix === 'PENDING' || prefix === 'UNKNOWN') return 'BOOTSTRAPPING'
  return 'NEUTRAL'
}

// Détecte si la chaîne renvoyée porte une explication après l'enum
// ("BOOTSTRAPPING — 5 décisions, outcomes à venir") et la rend lisible.
export function statusExplanation(raw: string | null | undefined): string | null {
  if (!raw) return null
  const split = raw.split(/[\s]+[—–-]+[\s]+/)
  if (split.length < 2) return null
  return split.slice(1).join(' — ').trim() || null
}

// Humanisation des raisons techniques renvoyées par les vues.
// Le backend renvoie déjà du français (« 4 cron(s) avec hoquets récents (résolus) »).
// On lisse les patterns connus pour rester court à l'UI.
export function humanizeReason(reason: string | null | undefined): string {
  if (!reason) return ''
  return reason
    .replace(/cron\(s\) avec hoquets récents \(résolus\)/g, 'hoquets résolus')
    .replace(/cron\(s\) actuellement cassé\(s\)/g, 'tâches cassées')
    .replace(/finding\(s\) critical ouvert\(s\)/g, 'anomalies à traiter')
    .replace(/cron\(s\) silencieux trop longtemps/g, 'tâches silencieuses')
    .replace(/Win rate D7/g, 'Performance moteur 7j')
    .replace(/cron\(s\)/g, 'tâche(s)')
}

// Format pourcentage avec une décimale propre.
export function formatPct(value: string | number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined) return fallback
  const n = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(n)) return fallback
  return `${n.toFixed(1)} %`
}

export function formatInt(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback
  return new Intl.NumberFormat('fr-FR').format(value)
}
