import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const portfolio = Array.isArray(body?.portfolio) ? body.portfolio : []
    const triggers = Array.isArray(body?.triggers) ? body.triggers : []

    const opportunities = portfolio
      .filter((p: any) => (p.weight ?? 0) < 8)
      .sort(
        (a: any, b: any) =>
          (b.unrealized_pnl_pct ?? 0) - (a.unrealized_pnl_pct ?? 0)
      )
      .slice(0, 3)
      .map((p: any) => ({
        asset: p.asset_name,
        ticker: p.ticker ?? '-',
        reason:
          (p.weight ?? 0) < 5
            ? 'Sous-pondéré avec profil intéressant dans le portefeuille.'
            : 'Pondération encore modérée avec dynamique correcte.',
        confidence: Number(
          Math.min(9.5, Math.max(6, (p.score ?? 6) + 0.5)).toFixed(1)
        ),
      }))

    const arbitrages = portfolio
      .filter((p: any) => (p.weight ?? 0) > 25 || (p.score ?? 0) < 5)
      .slice(0, 3)
      .map((p: any) => ({
        action: (p.weight ?? 0) > 25 ? 'TRIM' : 'ARBITRATE',
        asset: p.asset_name,
        ticker: p.ticker ?? '-',
        reason:
          (p.weight ?? 0) > 25
            ? 'Poids trop élevé dans le portefeuille, concentration excessive.'
            : 'Score faible relativement au reste du portefeuille.',
      }))

    let plan = 'Aucun plan spécifique pour le moment.'

    if (opportunities.length === 0 && arbitrages.length === 0) {
      plan =
        'Pas d’action prioritaire : conserver le portefeuille et attendre un meilleur point d’entrée.'
    } else if (opportunities.length > 0 && arbitrages.length === 0) {
      plan =
        'Prioriser les meilleures opportunités sous-pondérées et déployer le cash progressivement.'
    } else if (opportunities.length === 0 && arbitrages.length > 0) {
      plan =
        'Réduire les lignes les plus concentrées ou les moins qualitatives avant tout nouveau déploiement.'
    } else {
      plan =
        'Alléger les lignes les plus concentrées puis réallouer progressivement vers les meilleures opportunités détectées.'
    }

    return NextResponse.json({
      ok: true,
      parsed: {
        opportunities,
        arbitrages,
        plan,
        debug: {
          triggerCount: triggers.length,
          portfolioCount: portfolio.length,
          mode: 'mock',
        },
      },
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? 'Mock API error',
      },
      { status: 500 }
    )
  }
}