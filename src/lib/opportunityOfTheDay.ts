import { createClient } from '@supabase/supabase-js'

export const OPPORTUNITY_OF_DAY_USER_ID = '4c1610db-25cd-4eca-b16a-b5bb4898f4ff'

export type OpportunityRecord = Record<string, unknown>

/** EUR-based FX map, e.g. { EUR: 1, USD: 1.1646 }. Used to convert the
 *  EUR-denominated suggested amount into the asset's quote currency when
 *  pre-filling the staggered order-draft tranches. */
export type FxRates = Record<string, number>

export interface OpportunityOfTheDayPayload {
  raw: OpportunityRecord | null
  fxRates: FxRates
}

export async function getOpportunityOfTheDay(
  userId = OPPORTUNITY_OF_DAY_USER_ID,
): Promise<OpportunityOfTheDayPayload> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase environment missing')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'nx' },
    auth: { persistSession: false },
  })

  const [opportunity, fx] = await Promise.all([
    supabase.rpc('fn_opportunity_of_the_day', { p_user_id: userId }),
    supabase
      .from('v_fx_rates_latest')
      .select('quote_currency, rate')
      .eq('base_currency', 'EUR'),
  ])

  if (opportunity.error) {
    throw new Error(`fn_opportunity_of_the_day: ${opportunity.error.message}`)
  }

  return {
    raw: normalizeRpcResult(opportunity.data),
    fxRates: buildFxRates(fx.error ? null : fx.data),
  }
}

// EUR base. FX indisponible → on retombe sur { EUR: 1 } : les actifs non-EUR
// n'auront pas de quantité pré-calculée (saisie manuelle dans la feuille).
function buildFxRates(rows: unknown): FxRates {
  const rates: FxRates = { EUR: 1 }
  if (!Array.isArray(rows)) return rates

  for (const row of rows as Array<{ quote_currency?: unknown; rate?: unknown }>) {
    const quote = typeof row.quote_currency === 'string' ? row.quote_currency : null
    const rate = typeof row.rate === 'number' ? row.rate : Number(row.rate)
    if (quote && Number.isFinite(rate) && rate > 0) {
      rates[quote] = rate
    }
  }

  return rates
}

function normalizeRpcResult(data: unknown): OpportunityRecord | null {
  if (Array.isArray(data)) {
    const first = data[0]
    return isRecord(first) ? first : null
  }

  return isRecord(data) ? data : null
}

function isRecord(value: unknown): value is OpportunityRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
