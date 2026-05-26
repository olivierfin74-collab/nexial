// Read-only Supabase queries for /control. Server Components only.
// Official control sources only:
// - nx.vw_control_verdict
// - nx.vw_control_feed
// - nx.vw_control_data_freshness

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ControlDataFreshnessRow, ControlFeedRow, ControlVerdictRow } from './types'

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

export async function getControlVerdict(): Promise<ControlVerdictRow | null> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_control_verdict')
    .select('*')
    .maybeSingle()

  if (error) throw new Error(`vw_control_verdict: ${error.message}`)
  return (data as ControlVerdictRow | null) ?? null
}

export async function getControlFeed(): Promise<ControlFeedRow[]> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_control_feed')
    .select('*')
    .neq('control_state', 'HEALTHY')
    .order('sort_priority', { ascending: true })

  if (error) throw new Error(`vw_control_feed: ${error.message}`)
  return (data as ControlFeedRow[] | null) ?? []
}

export async function getControlDataFreshness(): Promise<ControlDataFreshnessRow[]> {
  const supabase = await createControlClient()
  const { data, error } = await supabase
    .from('vw_control_data_freshness')
    .select('*')

  if (error) throw new Error(`vw_control_data_freshness: ${error.message}`)
  return (data as ControlDataFreshnessRow[] | null) ?? []
}
