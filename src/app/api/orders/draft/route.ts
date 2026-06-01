import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Crée des brouillons d'ordre (status='draft') depuis "Opportunité du Jour"
// via nx.fn_create_order_draft. JAMAIS de soumission broker — les brouillons
// sont visibles dans l'onglet Ordres et validés/soumis manuellement.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const USER_ID_DEV = '4c1610db-25cd-4eca-b16a-b5bb4898f4ff'

const ORDER_SIDES = new Set(['buy', 'sell'])
const CURRENCIES = new Set([
  'EUR', 'USD', 'GBP', 'JPY', 'CHF', 'SEK', 'NOK', 'DKK', 'CAD', 'AUD', 'CNY', 'HKD',
])

interface TrancheInput {
  quantity: number
  limit_price: number | null
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseTranches(raw: unknown): TrancheInput[] {
  if (!Array.isArray(raw)) return []
  const tranches: TrancheInput[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const quantity = toNumber(record.quantity)
    if (quantity === null || quantity <= 0) continue // ignore tranches vides
    const limitPrice = toNumber(record.limit_price)
    tranches.push({ quantity, limit_price: limitPrice })
  }
  return tranches
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>

    const assetId = typeof body.assetId === 'string' ? body.assetId.trim() : ''
    const accountId = typeof body.accountId === 'string' ? body.accountId.trim() : ''
    const side = String(body.side ?? 'buy').toLowerCase()
    const currency = String(body.currency ?? '').toUpperCase()
    const sourceScore = toNumber(body.sourceScore)
    const tranches = parseTranches(body.tranches)

    if (!assetId) {
      return NextResponse.json({ error: 'assetId manquant' }, { status: 400 })
    }
    if (!accountId) {
      return NextResponse.json({ error: 'accountId manquant' }, { status: 400 })
    }
    if (!ORDER_SIDES.has(side)) {
      return NextResponse.json({ error: `side invalide: ${side}` }, { status: 400 })
    }
    if (!CURRENCIES.has(currency)) {
      return NextResponse.json({ error: `devise invalide: ${currency}` }, { status: 400 })
    }
    if (tranches.length === 0) {
      return NextResponse.json(
        { error: 'Aucune tranche valide (quantité > 0 requise)' },
        { status: 400 },
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      db: { schema: 'nx' },
      auth: { persistSession: false },
    })

    const { data, error } = await supabase.rpc('fn_create_order_draft', {
      p_user_id: USER_ID_DEV,
      p_asset_id: assetId,
      p_account_id: accountId,
      p_side: side,
      p_currency: currency,
      p_tranches: tranches,
      p_source_score: sourceScore,
    })

    if (error) {
      console.error('[/api/orders/draft] supabase rpc error', error)
      return NextResponse.json(
        { error: error.message, code: error.code ?? null },
        { status: 500 },
      )
    }

    return NextResponse.json({ result: data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error'
    console.error('[/api/orders/draft] error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
