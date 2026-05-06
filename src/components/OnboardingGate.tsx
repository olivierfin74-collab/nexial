'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type OnboardingGateProps = {
  children: ReactNode
}

const PUBLIC_PATHS = ['/login', '/reset-password', '/update-password', '/auth']
const ONBOARDING_PATH = '/onboarding'

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}

export default function OnboardingGate({ children }: OnboardingGateProps) {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function checkOnboarding() {
      setChecking(true)

      if (isPublicPath(pathname)) {
        setChecking(false)
        return
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (cancelled) return

      if (userError || !user) {
        setChecking(false)
        return
      }

      const isTestUser = user.user_metadata?.is_test_user === true

      if (!isTestUser) {
        setChecking(false)
        return
      }

      if (pathname === ONBOARDING_PATH) {
        setChecking(false)
        return
      }

      const { data, error } = await supabase
        .from('user_onboarding_state_v1')
        .select('onboarding_status')
        .eq('user_id', user.id)
        .eq('onboarding_status', 'completed')
        .maybeSingle()

      if (cancelled) return

      if (error) {
        console.error('Onboarding check error:', error)
        setChecking(false)
        return
      }

      if (!data) {
        router.replace(ONBOARDING_PATH)
        return
      }

      setChecking(false)
    }

    checkOnboarding()

    return () => {
      cancelled = true
    }
  }, [pathname, router, supabase])

  if (checking) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#08111f] text-white">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-4 text-sm text-slate-300">
          Préparation Nexial...
        </div>
      </main>
    )
  }

  return <>{children}</>
}