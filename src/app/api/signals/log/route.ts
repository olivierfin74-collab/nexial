import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const triggers = Array.isArray(body?.triggers) ? body.triggers : []
    const enriched = Array.isArray(body?.portfolio) ? body.portfolio : []

    if (triggers.length === 0) {
      return NextResponse.json({
        ok: true,
        inserted: 0,
        message: 'Aucun trigger à enregistrer',
      })
    }

    const rows = triggers.map((trigger: any) => {
      const match = enriched.find(
        (p: any) =>
          p.asset_name === trigger.asset &&
          (p.ticker ?? '-') === (trigger.ticker ?? '-')
      )

      return {
        asset_name: trigger.asset,
        ticker: trigger.ticker ?? null,
        signal_type: trigger.type,
        signal_strength: trigger.strength ?? null,
        signal_value: trigger.value ?? null,
        score: match?.score ?? null,
        weight_pct: match?.weight ?? null,
        market_value: match?.market_value ?? null,
        current_price: match?.current_price ?? null,
        rationale: buildRationale(trigger),
        source: 'dashboard_trigger',
      }
    })

    const { error } = await supabase.from('signal_logs_v1').insert(rows)

    if (error) {
      return NextResponse.json(
        {
          ok: false,
          error,
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      ok: true,
      inserted: rows.length,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    )
  }
}

function buildRationale(trigger: any) {
  switch (trigger.type) {
    case 'PULLBACK':
      return 'Correction significative détectée'
    case 'FAST_DROP':
      return 'Baisse rapide à analyser'
    case 'OVEREXTENDED':
      return 'Hausse étendue, risque d’excès'
    case 'OVERWEIGHT':
      return 'Poids trop élevé dans le portefeuille'
    case 'UNDERWEIGHT_OPPORTUNITY':
      return 'Ligne légère avec profil intéressant'
    case 'WEAK_ASSET':
      return 'Actif jugé faible selon le scoring'
    default:
      return 'Signal détecté automatiquement'
  }
}