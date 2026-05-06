'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { AlertRow } from '@/types/nx'

interface UseActiveAlertsResult {
  alerts: AlertRow[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useActiveAlerts(): UseActiveAlertsResult {
  const supabase = useMemo(() => createClient(), [])

  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    setError(null)

    const { data, error: rpcError } = await supabase.rpc(
      'fn_get_my_active_alerts',
    )

    if (rpcError) {
      setError(new Error(rpcError.message))
      setAlerts([])
      setLoading(false)
      return
    }

    const rows = (data ?? []) as AlertRow[]

    // Sort client-side by score_when_created DESC, NULLS last.
    const sorted = [...rows].sort((a, b) => {
      const sa = a.score_when_created
      const sb = b.score_when_created
      if (sa == null && sb == null) return 0
      if (sa == null) return 1
      if (sb == null) return -1
      return sb - sa
    })

    setAlerts(sorted)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  return {
    alerts,
    loading,
    error,
    refetch: fetchAlerts,
  }
}
