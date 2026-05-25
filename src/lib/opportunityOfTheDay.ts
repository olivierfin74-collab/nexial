import { createClient } from '@supabase/supabase-js'

export const OPPORTUNITY_OF_DAY_USER_ID = '4c1610db-25cd-4eca-b16a-b5bb4898f4ff'

export type OpportunityRecord = Record<string, unknown>

export interface OpportunityOfTheDayPayload {
  raw: OpportunityRecord | null
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

  const { data, error } = await supabase.rpc('fn_opportunity_of_the_day', {
    p_user_id: userId,
  })

  if (error) {
    throw new Error(`fn_opportunity_of_the_day: ${error.message}`)
  }

  return { raw: normalizeRpcResult(data) }
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
