'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/types/nx'

interface UseUserResult {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  signOut: () => Promise<void>
}

export function useUser(): UseUserResult {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
    const { data, error } = await supabase.rpc('fn_get_my_profile')
    if (error) {
      console.error('[useUser] fetchProfile error:', error.message)
      return null
    }
    if (data == null) return null
    if (Array.isArray(data)) return (data[0] as UserProfile) ?? null
    return data as UserProfile
  }, [supabase])

  useEffect(() => {
    let active = true

    void (async () => {
      const {
        data: { user: initial },
      } = await supabase.auth.getUser()
      if (!active) return
      setUser(initial)

      if (initial) {
        const p = await fetchProfile()
        if (!active) return
        setProfile(p)
      }
      setLoading(false)
    })()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ?? null
      setUser(newUser)
      if (newUser) {
        // Refetch profile on login / token refresh.
        void (async () => {
          const p = await fetchProfile()
          if (active) setProfile(p)
        })()
      } else {
        setProfile(null)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
    router.push('/login')
    router.refresh()
  }, [supabase, router])

  return {
    user,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signOut,
  }
}
