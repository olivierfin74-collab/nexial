'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import type { UserRole as NxUserRole, UserProfile } from '@/types/nx'
import {
  Activity,
  Bell,
  BriefcaseBusiness,
  ChevronDown,
  Code2,
  Landmark,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Radar,
  ReceiptText,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Sparkles,
  UserCircle,
  X,
} from 'lucide-react'

type NavItem = {
  href: string
  label: string
  mode: string
  description: string
  icon: ReactNode
}

type UserRole = 'super_admin' | 'admin' | 'beta_tester' | 'user'

type UserInfo = {
  id: string
  email: string | null
  pseudo: string
  role: UserRole
  roleLabel: string
  isTestUser: boolean
  metadata: Record<string, unknown>
  appMetadata: Record<string, unknown>
}

type OnboardingInfo = {
  onboarding_status: string | null
  investment_mode: string | null
  monthly_amount: number | null
  account_scope: string | null
  completed_at: string | null
} | null

type UserNotice = {
  type: 'success' | 'error'
  message: string
} | null

const NAV_ITEMS: NavItem[] = [
  { href: '/aujourdhui', label: "Aujourd'hui", mode: 'DAILY', description: 'Signaux du jour', icon: <Sparkles size={15} /> },
  { href: '/opportunites', label: 'Opportunités', mode: 'ALERTS', description: 'Alertes actives en attente', icon: <Bell size={15} /> },
  { href: '/', label: 'Dashboard', mode: 'DECISION', description: 'Décision immédiate', icon: <LayoutDashboard size={15} /> },
  { href: '/portfolio', label: 'Portfolio', mode: 'PORTFOLIO', description: 'Capital réel', icon: <BriefcaseBusiness size={15} /> },
  { href: '/watchlist', label: 'Watchlist', mode: 'OPPORTUNITY', description: 'Radar opportunités', icon: <Radar size={15} /> },
  { href: '/actions', label: 'Actions', mode: 'ORDER CREATION', description: 'Créer les ordres', icon: <ListChecks size={15} /> },
  { href: '/orders', label: 'Orders', mode: 'ORDER EXECUTION', description: 'Suivre et confirmer', icon: <ReceiptText size={15} /> },
  { href: '/patrimoine', label: 'Patrimoine', mode: 'WEALTH', description: 'Vision globale', icon: <Landmark size={15} /> },
  { href: '/dev', label: 'Dev', mode: 'DEV', description: 'Contrôle moteur', icon: <Code2 size={15} /> },
]

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/' || pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function getCurrentItem(pathname: string) {
  return NAV_ITEMS.find((item) => isActive(pathname, item.href)) ?? NAV_ITEMS[0]
}

function shortId(value?: string | null) {
  if (!value) return '—'
  return `${value.slice(0, 8)}…${value.slice(-4)}`
}

function getString(meta: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = meta[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function getPseudo(email: string | null, metadata: Record<string, unknown>) {
  return (
    getString(metadata, ['pseudo', 'username', 'display_name', 'full_name', 'name']) ||
    email?.split('@')[0] ||
    'Utilisateur'
  )
}

function getRole(userMetadata: Record<string, unknown>, appMetadata: Record<string, unknown>): UserRole {
  const raw =
    getString(appMetadata, ['role', 'user_role', 'app_role']) ||
    getString(userMetadata, ['role', 'user_role', 'app_role'])

  const role = String(raw || '').toLowerCase()

  if (role === 'super_admin' || role === 'superadmin' || role === 'owner') return 'super_admin'
  if (role === 'admin') return 'admin'
  if (role === 'beta_tester' || role === 'beta') return 'beta_tester'

  if (userMetadata.is_super_admin === true || appMetadata.is_super_admin === true) return 'super_admin'
  if (userMetadata.is_admin === true || appMetadata.is_admin === true) return 'admin'
  if (userMetadata.is_test_user === true) return 'beta_tester'

  return 'user'
}

function roleLabel(role: UserRole) {
  if (role === 'super_admin') return 'SUPER ADMIN'
  if (role === 'admin') return 'ADMIN'
  if (role === 'beta_tester') return 'BETA TESTER'
  return 'USER'
}

function roleClass(role?: UserRole) {
  if (role === 'super_admin') return 'border-purple-300/30 bg-purple-400/10 text-purple-100'
  if (role === 'admin') return 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100'
  if (role === 'beta_tester') return 'border-amber-300/30 bg-amber-400/10 text-amber-100'
  return 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
}

// ADR-10 v2 light pills on dark nav background — premium contrast for nx.user_role enum.
function nxRoleClass(role: NxUserRole | undefined): string {
  if (role === 'admin') return 'border-[var(--forest-green-light)] bg-[var(--pour-bg)] text-[var(--forest-green)]'
  if (role === 'beta') return 'border-[#C68F1A] bg-[var(--alert-amber)] text-[#8B6914]'
  if (role === 'paid') return 'border-[var(--burgundy-light)] bg-[var(--contre-bg)] text-[var(--burgundy)]'
  return 'border-slate-400/30 bg-slate-400/10 text-slate-200'
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default function AppNav({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const currentItem = getCurrentItem(pathname)

  // nx profile (display_name + role) takes priority over legacy userInfo when available.
  const { profile } = useUser()

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [onboardingInfo, setOnboardingInfo] = useState<OnboardingInfo>(null)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [loadingUser, setLoadingUser] = useState(true)
  const [signingOut, setSigningOut] = useState(false)
  const [resettingOnboarding, setResettingOnboarding] = useState(false)
  const [notice, setNotice] = useState<UserNotice>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  async function loadUser() {
    setLoadingUser(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setUserInfo(null)
      setOnboardingInfo(null)
      setLoadingUser(false)
      return
    }

    const metadata = (user.user_metadata || {}) as Record<string, unknown>
    const appMetadata = (user.app_metadata || {}) as Record<string, unknown>
    const role = getRole(metadata, appMetadata)

    setUserInfo({
      id: user.id,
      email: user.email || null,
      pseudo: getPseudo(user.email || null, metadata),
      role,
      roleLabel: roleLabel(role),
      isTestUser: metadata.is_test_user === true,
      metadata,
      appMetadata,
    })

    // Table public.user_onboarding_state_v1 absente en DB → fetch désactivé
    // pour éviter un 404 réseau au mount sur toutes les pages. Le modal
    // préférences gère déjà le cas null via fallback "non initialisé" / "—".
    // const { data } = await supabase
    //   .from('user_onboarding_state_v1')
    //   .select('onboarding_status, investment_mode, monthly_amount, account_scope, completed_at')
    //   .eq('user_id', user.id)
    //   .maybeSingle()
    //
    // setOnboardingInfo((data as OnboardingInfo) || null)
    setOnboardingInfo(null)
    setLoadingUser(false)
  }

  useEffect(() => {
    loadUser()
  }, [pathname])

  // Close avatar dropdown on outside click or Escape.
  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [dropdownOpen])

  async function signOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    setSigningOut(false)
    router.push('/login')
    router.refresh()
  }

  async function resetOnboarding() {
    if (!userInfo) return

    setResettingOnboarding(true)
    setNotice(null)

    const { error } = await supabase
      .from('user_onboarding_state_v1')
      .delete()
      .eq('user_id', userInfo.id)

    if (error) {
      setNotice({ type: 'error', message: error.message })
      setResettingOnboarding(false)
      return
    }

    setOnboardingInfo(null)
    setNotice({ type: 'success', message: 'Onboarding réinitialisé. Redirection vers le setup.' })
    setResettingOnboarding(false)
    setPreferencesOpen(false)
    router.push('/onboarding')
  }

  // Mobile + Desktop route bypass : pas de top header AppNav sur /mobile et
  // /desktop (chaque proto a sa propre TopNav/BottomNav). Early-return placé
  // après tous les hooks pour préserver l'ordre des hooks lors des navigations.
  if (pathname?.startsWith('/mobile') || pathname?.startsWith('/desktop')) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[linear-gradient(180deg,rgba(7,17,31,0.97)_0%,rgba(7,17,31,0.82)_100%)] shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <div className="flex min-h-28 w-full items-center justify-between gap-6 px-6 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="group min-w-[235px]">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200 shadow-[0_0_35px_rgba(34,211,238,0.12)] transition group-hover:border-cyan-300/40 group-hover:bg-cyan-300/15">
                <Activity size={20} />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.46em] text-cyan-300">NEXIAL</p>
                <p className="mt-1 text-xl font-semibold tracking-tight text-white">Investment Engine</p>
                <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.26em] text-slate-500">
                  Decision & Execution System
                </p>
              </div>
            </div>
          </Link>

          <nav
            aria-label="Navigation principale Nexial"
            className="hidden items-center gap-1 rounded-full border border-white/8 bg-white/[0.035] p-1.5 text-sm text-slate-300 shadow-[0_20px_70px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:flex"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={item.description}
                  aria-current={active ? 'page' : undefined}
                  className={`relative inline-flex items-center gap-2 rounded-full px-3.5 py-2.5 font-medium transition-all duration-200 ease-out ${
                    active
                      ? 'bg-gradient-to-r from-cyan-400/20 to-blue-500/20 text-white shadow-[0_0_28px_rgba(56,189,248,0.26)]'
                      : 'text-slate-400 hover:scale-[1.02] hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={active ? 'text-cyan-200' : 'text-slate-500'}>{item.icon}</span>
                  {item.label}

                  {active && (
                    <span className="absolute -bottom-1 left-1/2 h-[2px] w-7 -translate-x-1/2 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.85)]" />
                  )}
                </Link>
              )
            })}
          </nav>

          <div ref={dropdownRef} className="relative hidden shrink-0 md:block">
            <button
              type="button"
              onClick={() => setDropdownOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
              className="group flex max-w-[260px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-cyan-300/30 hover:bg-white/[0.07]"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
                <UserCircle size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {profile?.display_name ?? (loadingUser ? 'Chargement...' : userInfo?.pseudo || 'Non connecté')}
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-slate-500">
                  {profile ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${nxRoleClass(profile.role)}`}>
                      {profile.role.toUpperCase()}
                    </span>
                  ) : userInfo ? (
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleClass(userInfo.role)}`}>
                      {userInfo.roleLabel}
                    </span>
                  ) : (
                    'Session inactive'
                  )}
                </p>
              </div>
              <ChevronDown
                size={14}
                className={`shrink-0 text-slate-400 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-[60] mt-2 w-56 overflow-hidden"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  padding: 8,
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.18)',
                }}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setPreferencesOpen(true)
                    setDropdownOpen(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--canvas)]"
                  style={{
                    color: 'var(--ink-primary)',
                    fontFamily: 'var(--font-editorial-sans)',
                  }}
                >
                  <Settings size={14} style={{ color: 'var(--ink-muted)' }} />
                  Préférences
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setDropdownOpen(false)
                    void signOut()
                  }}
                  disabled={signingOut}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 hover:bg-[var(--contre-bg)] hover:text-[var(--burgundy)] disabled:cursor-not-allowed disabled:opacity-40"
                  style={{
                    color: 'var(--ink-primary)',
                    fontFamily: 'var(--font-editorial-sans)',
                  }}
                >
                  <LogOut size={14} />
                  {signingOut ? 'Déconnexion…' : 'Déconnexion'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-white/5 px-4 py-3 lg:hidden">
          <nav
            aria-label="Navigation mobile Nexial"
            className="flex gap-2 overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.035] p-2 text-sm text-slate-300"
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.href)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2 font-medium transition ${
                    active
                      ? 'bg-cyan-300/15 text-white ring-1 ring-cyan-300/25'
                      : 'text-slate-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className={active ? 'text-cyan-200' : 'text-slate-500'}>{item.icon}</span>
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.035] p-3">
            <button type="button" onClick={() => setPreferencesOpen(true)} className="min-w-0 text-left">
              <p className="truncate text-sm font-semibold text-white">
                {profile?.display_name ?? userInfo?.pseudo ?? 'Non connecté'}
              </p>
              <p className="text-xs text-slate-500">
                {currentItem.mode} · {profile ? profile.role.toUpperCase() : userInfo?.roleLabel || 'SESSION INACTIVE'}
              </p>
            </button>

            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              title="Déconnexion"
              aria-label="Déconnexion"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-transparent text-[var(--ink-secondary)] transition-colors duration-150 hover:bg-[var(--contre-bg)] hover:text-[var(--burgundy)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      <main className="w-full px-6 py-8 sm:px-8 lg:px-10">{children}</main>

      {preferencesOpen && (
        <UserPreferencesModal
          userInfo={userInfo}
          profile={profile}
          onboardingInfo={onboardingInfo}
          currentMode={currentItem.mode}
          currentDescription={currentItem.description}
          loadingUser={loadingUser}
          notice={notice}
          resettingOnboarding={resettingOnboarding}
          onClose={() => setPreferencesOpen(false)}
          onSignOut={signOut}
          onResetOnboarding={resetOnboarding}
          signingOut={signingOut}
        />
      )}
    </div>
  )
}

function UserPreferencesModal({
  userInfo,
  profile,
  onboardingInfo,
  currentMode,
  currentDescription,
  loadingUser,
  notice,
  resettingOnboarding,
  onClose,
  onSignOut,
  onResetOnboarding,
  signingOut,
}: {
  userInfo: UserInfo | null
  profile: UserProfile | null
  onboardingInfo: OnboardingInfo
  currentMode: string
  currentDescription: string
  loadingUser: boolean
  notice: UserNotice
  resettingOnboarding: boolean
  onClose: () => void
  onSignOut: () => void
  onResetOnboarding: () => void
  signingOut: boolean
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#07111f] p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-300">
              Préférences utilisateur
            </p>
            <h2 className="mt-3 text-3xl font-semibold">
              {profile?.display_name ?? profile?.username ?? (loadingUser ? 'Chargement...' : userInfo?.pseudo || 'Session inactive')}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Profil, statut, onboarding et métadonnées pour sécuriser les tests.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {notice && (
          <div
            className={`mt-5 rounded-2xl border p-4 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                : 'border-red-300/30 bg-red-400/10 text-red-100'
            }`}
          >
            {notice.message}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <PreferenceCard label="Pseudo" value={profile?.username || profile?.display_name || userInfo?.pseudo || 'Anonyme'} />
          <PreferenceCard label="Rôle" value={profile ? profile.role.toUpperCase() : userInfo?.roleLabel || '—'} tone={profile || userInfo ? 'positive' : 'neutral'} />
          <PreferenceCard label="Email" value={profile?.email || userInfo?.email || '—'} />
          <PreferenceCard label="User ID" value={shortId(profile?.id || userInfo?.id)} />
          <PreferenceCard label="Mode actuel" value={currentMode} />
          <PreferenceCard label="Page actuelle" value={currentDescription} />
        </div>

        <section className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Onboarding beta</p>
              <p className="mt-1 text-sm text-slate-400">
                État du flow d’introduction et paramètres utilisateur.
              </p>
            </div>

            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                onboardingInfo?.onboarding_status === 'completed'
                  ? 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                  : 'border-amber-300/30 bg-amber-400/10 text-amber-100'
              }`}
            >
              {onboardingInfo?.onboarding_status || 'non initialisé'}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MiniInfo label="Mode investissement" value={onboardingInfo?.investment_mode || '—'} />
            <MiniInfo label="Montant mensuel" value={onboardingInfo?.monthly_amount ? `${onboardingInfo.monthly_amount} €` : '—'} />
            <MiniInfo label="Enveloppe" value={onboardingInfo?.account_scope || '—'} />
            <MiniInfo label="Complété le" value={formatDate(onboardingInfo?.completed_at)} />
          </div>
        </section>

        <section className="mt-5 rounded-[1.5rem] border border-white/10 bg-black/20 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <ShieldCheck size={16} className="text-cyan-300" />
            Metadata utilisateur
          </div>

          <pre className="mt-3 max-h-48 overflow-auto rounded-2xl border border-white/10 bg-black/30 p-4 text-xs leading-5 text-slate-300">
            {JSON.stringify(
              {
                user_metadata: userInfo?.metadata || {},
                app_metadata: userInfo?.appMetadata || {},
              },
              null,
              2
            )}
          </pre>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            onClick={onClose}
            className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-5 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
          >
            Voir onboarding
          </Link>

          <button
            type="button"
            onClick={onResetOnboarding}
            disabled={resettingOnboarding || !userInfo}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-400/10 px-5 py-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RefreshCcw size={15} />
            {resettingOnboarding ? 'Réinitialisation...' : 'Reset onboarding'}
          </button>

          <button
            type="button"
            onClick={onSignOut}
            disabled={signingOut || !userInfo}
            className="rounded-full border border-red-300/30 bg-red-400/10 px-5 py-3 text-sm font-semibold text-red-100 transition hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {signingOut ? 'Déconnexion...' : 'Déconnexion'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/[0.05] px-5 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

function PreferenceCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: string
  tone?: 'neutral' | 'positive' | 'warning'
}) {
  const valueClass =
    tone === 'positive'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-amber-300'
        : 'text-white'

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className={`mt-2 truncate text-sm font-semibold ${valueClass}`}>{value}</p>
    </div>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  )
}