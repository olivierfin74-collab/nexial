'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const SIGNAL_VIEW = 'vw_top_ideas_v1'

type RawIdeaRow = {
  ticker: string
  close_price: number | null
  drawdown: number | null
  nb_points: number | null
  decision: string | null
  priority: number | null
}

type SignalRow = {
  id: string
  ticker: string
  asset_name: string | null
  account_type: string | null
  latest_price: number | null
  currency: string | null
  buy_zone_low: number | null
  buy_zone_high: number | null
  distance_to_buy_zone_pct: number | null
  zone_status: string | null
  price_quality: string | null
  priority_score: number | null
  score: number | null
  capital_efficiency_score: number | null
  nexial_score: number | null
  nexial_phase: string | null
  nexial_action: string | null
  nexial_reason: string | null
  thesis: string | null
  price_timestamp: string | null
}

type ScoredSignalRow = SignalRow & {
  nexialScore: number
}

type WatchCandidateRow = ScoredSignalRow & {
  diff: number
}

function money(value?: number | null, currency = 'EUR') {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value))
}

function num(value?: number | null, digits = 2) {
  if (value == null || Number.isNaN(Number(value))) return '—'

  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number(value))
}

function pct(value?: number | null) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(2)} %`
}

function diffPct(current?: number | null, limit?: number | null) {
  if (current == null || limit == null || limit === 0) return null

  return ((current - limit) / limit) * 100
}

function distanceToBuyZonePct(row: SignalRow) {
  const computed = diffPct(row.latest_price, row.buy_zone_high)

  if (computed != null) return computed

  if (
    row.distance_to_buy_zone_pct != null &&
    !Number.isNaN(Number(row.distance_to_buy_zone_pct))
  ) {
    return Number(row.distance_to_buy_zone_pct)
  }

  return null
}

function normalizeDecisionToPhase(decision?: string | null) {
  const d = String(decision || '').toUpperCase()

  if (d === 'STRONG_BUY_ZONE') return 'BUY'
  if (d === 'BUY_ZONE') return 'BUY'
  if (d === 'WATCH') return 'WATCH'

  return 'WAIT'
}

function isBuy(row: SignalRow) {
  return String(row.nexial_phase || '').toUpperCase() === 'BUY'
}

function isWatch(row: SignalRow) {
  return String(row.nexial_phase || '').toUpperCase() === 'WATCH'
}

function isWait(row: SignalRow) {
  return String(row.nexial_phase || '').toUpperCase() === 'WAIT'
}

function isPriceOk(row: SignalRow) {
  return String(row.price_quality || '').toUpperCase() === 'OK'
}

function isFresh(timestamp?: string | null) {
  if (!timestamp) return false

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return false

  const diffHours = (Date.now() - date.getTime()) / 36e5
  return diffHours <= 48
}

function freshnessLabel(timestamp?: string | null) {
  if (!timestamp) return 'MAJ inconnue'

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) return 'MAJ inconnue'

  const diffHours = (Date.now() - date.getTime()) / 36e5

  if (diffHours < 24) return '< 24h'
  if (diffHours < 48) return '24-48h'
  if (diffHours < 72) return '48-72h'

  return '> 72h'
}

function zoneLabel(row: SignalRow) {
  if (row.buy_zone_low != null && row.buy_zone_high != null) {
    return `${money(row.buy_zone_low, row.currency || 'EUR')} - ${money(
      row.buy_zone_high,
      row.currency || 'EUR'
    )}`
  }

  if (isBuy(row)) return 'Zone achat validée'
  if (isWatch(row)) return 'Zone surveillance'
  return 'Aucune zone'
}

function phaseRank(row: SignalRow) {
  const phase = String(row.nexial_phase || '').toUpperCase()

  if (phase === 'BUY') return 4
  if (phase === 'WATCH') return 3
  if (phase === 'WAIT') return 2
  if (phase === 'RISK') return 1

  return 0
}

function executionStatus(row: SignalRow) {
  const phase = String(row.nexial_phase || '').toUpperCase()
  const quality = String(row.price_quality || '').toUpperCase()

  if (quality !== 'OK') {
    return {
      label: 'Achat bloqué',
      detail: 'La donnée prix n’est pas fiable. Nexial bloque l’achat.',
      tone: 'watch' as const,
    }
  }

  if (phase === 'BUY') {
    return {
      label: 'Acheter possible',
      detail:
        row.nexial_reason ||
        'Actif en zone d’achat validée par le moteur Nexial.',
      tone: 'buy' as const,
    }
  }

  if (phase === 'WATCH') {
    return {
      label: 'Surveillance active',
      detail:
        row.nexial_reason ||
        'Actif intéressant mais pas encore en achat propre.',
      tone: 'watch' as const,
    }
  }

  return {
    label: 'Attendre',
    detail:
      row.nexial_reason ||
      'Prix trop haut : attendre un meilleur point d’entrée.',
    tone: 'wait' as const,
  }
}

function opportunityScoreLabel(score: number) {
  if (score < 30) return 'Peu d’opportunités exploitables'
  if (score < 60) return 'Opportunités moyennes'
  if (score < 75) return 'Opportunités intéressantes'
  return 'Opportunités fortes'
}

function computeNexialScore(row: SignalRow) {
  const phase = String(row.nexial_phase || '').toUpperCase()
  const priceQuality = String(row.price_quality || '').toUpperCase()
  const baseScore = Number(row.nexial_score ?? row.score ?? 0)
  const capitalEfficiency = Number(row.capital_efficiency_score ?? 0)
  const priority = Number(row.priority_score ?? 0)
  const distance = distanceToBuyZonePct(row)

  const phaseBoost =
    phase === 'BUY'
      ? 25
      : phase === 'WATCH'
        ? 15
        : phase === 'WAIT'
          ? 5
          : 0

  const distanceScore =
    distance == null
      ? 0
      : distance <= -20
        ? 30
        : distance <= -10
          ? 25
          : distance <= -5
            ? 20
            : distance <= 0
              ? 15
              : 0

  const dataPenalty = priceQuality === 'OK' ? 0 : -35

  const computed =
    baseScore * 0.45 +
    capitalEfficiency * 0.2 +
    priority * 10 +
    phaseBoost +
    distanceScore +
    dataPenalty

  return Math.round(Math.min(100, Math.max(0, computed)))
}

function mapRawIdeaToSignalRow(row: RawIdeaRow): SignalRow {
  const decision = String(row.decision || '').toUpperCase()
  const phase = normalizeDecisionToPhase(decision)
  const priority = Number(row.priority || 0)
  const drawdownPct = row.drawdown == null ? null : Number(row.drawdown) * 100
  const score = Math.min(100, Math.max(0, priority * 33))

  return {
    id: `${row.ticker}-${decision}`,
    ticker: row.ticker,
    asset_name: row.ticker,
    account_type: null,
    latest_price: row.close_price,
    currency: 'EUR',
    buy_zone_low: null,
    buy_zone_high: null,
    distance_to_buy_zone_pct: drawdownPct,
    zone_status: decision,
    price_quality: 'OK',
    priority_score: priority,
    score,
    capital_efficiency_score: score,
    nexial_score: score,
    nexial_phase: phase,
    nexial_action: phase === 'BUY' ? 'BUY' : 'WATCH',
    nexial_reason:
      phase === 'BUY'
        ? `Drawdown ${num(drawdownPct, 2)} %. Zone d’achat détectée.`
        : `Drawdown ${num(
            drawdownPct,
            2
          )} %. Surveillance active, pas d’achat immédiat.`,
    thesis:
      decision === 'STRONG_BUY_ZONE'
        ? 'Opportunité forte détectée par drawdown.'
        : decision === 'BUY_ZONE'
          ? 'Zone d’achat détectée.'
          : 'Actif à surveiller.',
    price_timestamp: new Date().toISOString(),
  }
}

export default function ActionsPage() {
  const supabase = createClient()

  const [rows, setRows] = useState<SignalRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase
        .from(SIGNAL_VIEW)
        .select('*')
        .in('decision', ['WAIT', 'WATCH', 'BUY_ZONE', 'STRONG_BUY_ZONE'])
        .order('priority', { ascending: false })
        .order('drawdown', { ascending: true })
        .limit(10)

      if (error) {
        setError(error.message)
        setRows([])
      } else {
        const unique = new Map<string, SignalRow>()

        for (const raw of (data || []) as RawIdeaRow[]) {
          if (!unique.has(raw.ticker)) {
            unique.set(raw.ticker, mapRawIdeaToSignalRow(raw))
          }
        }

        setRows(Array.from(unique.values()).slice(0, 3))
      }

      setLoading(false)
    }

    load()
  }, [supabase])

  const scoredRows = useMemo<ScoredSignalRow[]>(() => {
    return rows.map((row) => ({
      ...row,
      nexialScore: computeNexialScore(row),
    }))
  }, [rows])

  const sortedRows = useMemo(() => {
    return [...scoredRows].sort((a, b) => {
      const phaseDiff = phaseRank(b) - phaseRank(a)
      if (phaseDiff !== 0) return phaseDiff

      return Number(b.nexialScore || 0) - Number(a.nexialScore || 0)
    })
  }, [scoredRows])

  const buyRows = useMemo(() => sortedRows.filter(isBuy), [sortedRows])
  const watchRows = useMemo(() => sortedRows.filter(isWatch), [sortedRows])
  const waitRows = useMemo(() => sortedRows.filter(isWait), [sortedRows])

  const topRows = useMemo(() => sortedRows.slice(0, 3), [sortedRows])

  const watchCandidates = useMemo<WatchCandidateRow[]>(() => {
    return [...scoredRows]
      .filter((row) =>
        ['ACTIVE', 'WATCH', 'WAIT', 'BUY'].includes(
          String(row.nexial_phase || row.nexial_action || '').toUpperCase()
        )
      )
      .map((row) => {
        const diff = distanceToBuyZonePct(row)
        return { ...row, diff }
      })
      .filter((row): row is WatchCandidateRow => row.diff != null && row.diff < 0)
      .sort((a, b) => a.diff - b.diff)
      .slice(0, 3)
  }, [scoredRows])

  const blockedRows = useMemo(() => {
    return topRows.filter((row) => !isPriceOk(row)).length
  }, [topRows])

  const staleRows = useMemo(() => {
    return topRows.filter((row) => !isFresh(row.price_timestamp)).length
  }, [topRows])

  const avgScore = useMemo(() => {
    if (topRows.length === 0) return 0

    return (
      topRows.reduce((sum, row) => sum + Number(row.nexialScore || 0), 0) /
      topRows.length
    )
  }, [topRows])

  const mainDecision =
    buyRows.length > 0
      ? 'Exécuter'
      : watchRows.length > 0
        ? 'Surveiller'
        : 'Attendre'

  const mainText =
    buyRows.length > 0
      ? `${buyRows.length} opportunité(s) en phase BUY. Priorité aux meilleurs scores Nexial.`
      : watchRows.length > 0
        ? 'Aucun achat propre immédiat. Surveillance active des actifs proches des zones.'
        : 'NO ACTION — WAIT. Aucune opportunité actionnable actuellement. Discipline : attendre un meilleur point d’entrée.'

  if (loading) {
    return (
      <main className="min-h-screen bg-[#111a33] p-8 text-white">
        <div className="mx-auto max-w-[1550px] rounded-[1.75rem] border border-white/10 bg-[#182441] p-8 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
            Nexial Actions
          </p>

          <h1 className="mt-3 text-3xl font-semibold">
            Chargement des actions...
          </h1>

          <p className="mt-2 text-sm text-blue-100">
            Lecture de {SIGNAL_VIEW}.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#111a33] px-5 py-5 text-white">
      <div className="mx-auto max-w-[1550px] space-y-5">
        <header className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#243763] via-[#1c2b50] to-[#151f3b] shadow-sm">
          <div className="px-7 py-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
                  Nexial Actions
                </p>

                <h1 className="mt-4 text-5xl font-semibold tracking-tight text-white">
                  Décisions à exécuter
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-blue-100">
                  Source officielle : Top idées Nexial. Acheter uniquement sur
                  opportunité actionnable. Sinon, Nexial bloque l’action et
                  impose la discipline.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Décision</p>

                  <p
                    className={`mt-1 text-2xl font-semibold ${
                      buyRows.length > 0
                        ? 'text-emerald-300'
                        : watchRows.length > 0
                          ? 'text-cyan-300'
                          : 'text-amber-300'
                    }`}
                  >
                    {mainDecision}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-right backdrop-blur">
                  <p className="text-xs text-blue-200">Score opportunités</p>

                  <p
                    className={`mt-1 text-4xl font-semibold ${
                      avgScore >= 70
                        ? 'text-emerald-300'
                        : avgScore >= 40
                          ? 'text-amber-300'
                          : 'text-red-300'
                    }`}
                  >
                    {num(avgScore, 0)}/100
                  </p>

                  <p className="mt-1 text-xs text-blue-200">
                    {opportunityScoreLabel(avgScore)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <section className="grid gap-3 border-t border-white/10 p-4 md:grid-cols-2 xl:grid-cols-7">
            <Kpi label="Signaux" value={String(rows.length)} />
            <Kpi
              label="BUY"
              value={String(buyRows.length)}
              positive={buyRows.length > 0}
            />
            <Kpi label="WATCH" value={String(watchRows.length)} />
            <Kpi label="WAIT" value={String(waitRows.length)} />
            <Kpi
              label="Achat bloqué"
              value={String(blockedRows)}
              danger={blockedRows > 0}
            />
            <Kpi
              label="Données anciennes"
              value={String(staleRows)}
              danger={staleRows > 0}
            />
            <Kpi label="Source" value="Top idées" />
          </section>
        </header>

        {error && (
          <section className="rounded-2xl border border-red-300/30 bg-red-400/10 p-4 text-sm text-red-200">
            Erreur source Actions : {error}
          </section>
        )}

        <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">
              Décision immédiate
            </p>

            <h2
              className={`mt-2 text-4xl font-semibold ${
                buyRows.length > 0
                  ? 'text-emerald-300'
                  : watchRows.length > 0
                    ? 'text-cyan-300'
                    : 'text-amber-300'
              }`}
            >
              {buyRows.length > 0 ? mainDecision : 'NO ACTION — WAIT'}
            </h2>

            <p className="mt-3 max-w-4xl text-base leading-7 text-blue-100">
              {mainText}
            </p>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <p className="text-sm font-medium text-blue-200">
              Règles d’exécution
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Discipline Nexial
            </h2>

            <div className="mt-5 space-y-3">
              <SystemLine label="Achat autorisé" value="BUY_ZONE uniquement" ok />
              <SystemLine label="Top idées" value="Max 3" ok />
              <SystemLine label="Doublon ticker" value="Interdit" ok />
              <SystemLine label="WAIT / WAIT_DATA" value="Masqués" ok />
            </div>
          </div>
        </section>

        {watchCandidates.length > 0 && (
          <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">
                  À surveiller — proches opportunités
                </h3>

                <p className="mt-1 text-sm text-blue-100">
                  Actifs les plus proches d’une zone exploitable selon la
                  distance prix / zone d’achat.
                </p>
              </div>

              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100">
                Top {watchCandidates.length}
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {watchCandidates.map((row, index) => (
                <div
                  key={`${row.id}-${row.ticker}-watch`}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <p className="font-bold text-white">
                        #{index + 1} {row.ticker}
                      </p>

                      <p className="text-sm text-blue-100">
                        {row.asset_name || row.ticker}
                      </p>

                      <p className="mt-2 text-xs text-blue-200">
                        Phase : {row.nexial_phase || '—'}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-blue-200">Distance</p>

                      <p className="font-semibold text-cyan-300">
                        {row.diff.toFixed(2)}%
                      </p>

                      <p className="mt-2 text-xs text-blue-200">Score</p>

                      <p className="font-bold text-white">
                        {num(row.nexialScore, 0)}/100
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {buyRows.length > 0 && (
          <section className="rounded-[1.5rem] border border-white/10 bg-[#182441] p-6 shadow-sm">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-white">
                  Top actions BUY
                </h2>

                <p className="mt-1 text-sm text-blue-100">
                  Une carte = une décision possible. Acheter reste bloqué hors
                  opportunité validée.
                </p>
              </div>

              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-sm text-blue-100">
                Max 3
              </span>
            </div>

            <div className="grid gap-4">
              {topRows.map((item, index) => {
                const actionable = isBuy(item) && isPriceOk(item)
                const fresh = isFresh(item.price_timestamp)
                const status = executionStatus(item)

                return (
                  <article
                    key={`${item.id}-${item.ticker}-${index}`}
                    className={`rounded-[1.35rem] border p-5 shadow-sm ${
                      actionable
                        ? 'border-emerald-300/30 bg-emerald-400/10'
                        : isWatch(item)
                          ? 'border-cyan-300/30 bg-cyan-300/10'
                          : 'border-white/10 bg-[#1d2b4c]'
                    }`}
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-blue-100">
                            #{index + 1}
                          </span>

                          <ScopeBadge value={item.account_type || 'UNKNOWN'} />

                          <h3 className="text-2xl font-semibold text-white">
                            {item.ticker}
                          </h3>

                          <p className="text-lg text-blue-100">
                            {item.asset_name || '—'}
                          </p>

                          {actionable && (
                            <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-200">
                              BUY
                            </span>
                          )}
                        </div>

                        <p className="mt-2 max-w-3xl text-sm leading-6 text-blue-100">
                          {item.nexial_reason ||
                            item.thesis ||
                            'Signal suivi par Nexial.'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <ScoreBadge value={item.nexialScore} />
                        <PhaseBadge value={item.nexial_phase || 'WATCH'} />
                        <QualityBadge value={item.price_quality || 'UNKNOWN'} />
                        <FreshnessBadge
                          label={freshnessLabel(item.price_timestamp)}
                          fresh={fresh}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <Info
                        label="Prix actuel"
                        value={money(item.latest_price, item.currency || 'EUR')}
                        highlight={isPriceOk(item)}
                      />
                      <Info label="Zone d’achat" value={zoneLabel(item)} />
                      <Info
                        label="Drawdown / distance"
                        value={pct(item.distance_to_buy_zone_pct)}
                      />
                      <Info
                        label="Score Nexial"
                        value={`${num(item.nexialScore, 0)}/100`}
                      />
                      <Info label="Score brut" value={num(item.score, 2)} />
                      <Info
                        label="Capital efficiency"
                        value={num(item.capital_efficiency_score, 2)}
                      />
                      <Info label="Priorité" value={num(item.priority_score, 2)} />
                      <Info label="Phase" value={item.nexial_phase || 'WATCH'} />
                    </div>

                    <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_420px]">
                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                          Raison Nexial
                        </p>

                        <p className="mt-2 text-sm leading-6 text-blue-100">
                          {item.nexial_reason || status.detail}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
                          Exécution
                        </p>

                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <button
                            disabled={!actionable}
                            className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                              actionable
                                ? 'border border-emerald-300/30 bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'
                                : 'cursor-not-allowed border border-white/10 bg-white/5 text-blue-200/50'
                            }`}
                          >
                            Acheter
                          </button>

                          <button className="rounded-xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
                            Surveiller
                          </button>

                          <button className="rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:bg-white/15">
                            Ignorer
                          </button>
                        </div>

                        <p
                          className={`mt-3 text-sm ${
                            status.tone === 'buy'
                              ? 'text-emerald-200'
                              : status.tone === 'wait'
                                ? 'text-amber-200'
                                : 'text-blue-100'
                          }`}
                        >
                          {status.detail}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-blue-100">
                        Devise : {item.currency || 'EUR'}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-blue-100">
                        Zone : {item.zone_status || '—'}
                      </span>

                      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-blue-100">
                        Source : Top idées Nexial
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )}

        {topRows.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-blue-100">
            Aucune opportunité actionnable actuellement. Marché trop proche des
            plus hauts. NO ACTION — WAIT.
          </div>
        )}
      </div>
    </main>
  )
}

function Kpi({
  label,
  value,
  positive,
  danger,
}: {
  label: string
  value: string
  positive?: boolean
  danger?: boolean
}) {
  const numericValue = Number(String(value).replace('/100', '').replace(',', '.'))
  const isScoreLike =
    String(value).includes('/100') && Number.isFinite(numericValue)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/10 p-4 shadow-sm backdrop-blur">
      <p className="text-sm font-medium text-blue-200">{label}</p>

      <p
        className={`mt-2 text-2xl font-semibold ${
          danger
            ? 'text-red-300'
            : positive
              ? 'text-emerald-300'
              : isScoreLike && numericValue < 30
                ? 'text-red-300'
                : isScoreLike && numericValue < 60
                  ? 'text-amber-300'
                  : isScoreLike
                    ? 'text-cyan-300'
                    : 'text-white'
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function SystemLine({
  label,
  value,
  ok,
}: {
  label: string
  value: string
  ok: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-sm text-blue-100">{label}</span>

      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
          ok
            ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
            : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        }`}
      >
        {value}
      </span>
    </div>
  )
}

function Info({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight
          ? 'border-cyan-300/30 bg-cyan-300/10'
          : 'border-white/10 bg-white/5'
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-200">
        {label}
      </p>

      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

function ScopeBadge({ value }: { value: string }) {
  const className =
    value === 'PEA'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : value === 'CTO'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : 'border-white/10 bg-white/10 text-blue-100'

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  )
}

function ScoreBadge({ value }: { value?: number | null }) {
  const score = Number(value || 0)

  const className =
    score >= 80
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : score >= 60
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : score >= 40
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-red-300/30 bg-red-400/10 text-red-200'

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
    >
      {num(score, 0)}/100
    </span>
  )
}

function PhaseBadge({ value }: { value: string }) {
  const phase = value.toUpperCase()

  const className =
    phase === 'BUY'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : phase === 'WATCH'
        ? 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200'
        : phase === 'WAIT'
          ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
          : 'border-red-300/30 bg-red-400/10 text-red-200'

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {phase}
    </span>
  )
}

function QualityBadge({ value }: { value: string }) {
  const normalized = value.toUpperCase()

  const className =
    normalized === 'OK'
      ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
      : normalized === 'STALE'
        ? 'border-amber-300/30 bg-amber-400/10 text-amber-200'
        : 'border-red-300/30 bg-red-400/10 text-red-200'

  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {value}
    </span>
  )
}

function FreshnessBadge({
  label,
  fresh,
}: {
  label: string
  fresh: boolean
}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
        fresh
          ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-200'
          : 'border-amber-300/30 bg-amber-400/10 text-amber-200'
      }`}
    >
      {label}
    </span>
  )
}