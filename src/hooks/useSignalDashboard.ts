'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type {
  SignalDashboardParams,
  SignalDashboardRow,
} from '@/types/nx'

interface UseSignalDashboardResult {
  signals: SignalDashboardRow[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useSignalDashboard(
  params?: SignalDashboardParams,
): UseSignalDashboardResult {
  const signalFilter = params?.p_signal_filter ?? null
  const inPortfolioOnly = params?.p_in_portfolio_only ?? false
  const minScore = params?.p_min_score ?? 70

  const [signals, setSignals] = useState<SignalDashboardRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchSignals = useCallback(async () => {
    setLoading(true)
    setError(null)

    const supabase = createClient()

    const { data, error: rpcError } = await supabase.rpc(
      'fn_get_signal_dashboard',
      {
        p_signal_filter: signalFilter,
        p_in_portfolio_only: inPortfolioOnly,
        p_min_score: minScore,
      },
    )

    if (rpcError) {
      setError(new Error(rpcError.message))
      setSignals([])
      setLoading(false)
      return
    }

    const rows = (data ?? []) as SignalDashboardRow[]

    // Sort client-side by opportunity_score DESC, NULLS last.
    const sorted = [...rows].sort((a, b) => {
      const sa = a.opportunity_score
      const sb = b.opportunity_score
      if (sa == null && sb == null) return 0
      if (sa == null) return 1
      if (sb == null) return -1
      return sb - sa
    })

    setSignals(sorted)
    setLoading(false)
  }, [signalFilter, inPortfolioOnly, minScore])

  useEffect(() => {
    void fetchSignals()
  }, [fetchSignals])

  return {
    signals,
    loading,
    error,
    refetch: fetchSignals,
  }
}
