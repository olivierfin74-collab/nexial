'use client'

// Bottom navigation for the mobile app shell.
//
// Pure presentational. No data fetching, no business logic. The active tab
// is derived from next/navigation pathname.

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Eye, Home, LayoutGrid, ListChecks } from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'

interface NavTab {
  path: string
  label: string
  Icon: ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>
}

const TABS: NavTab[] = [
  { path: '/dashboard', label: 'Dashboard', Icon: LayoutGrid },
  { path: '/aujourdhui', label: 'Aujourd’hui', Icon: Home },
  { path: '/orders', label: 'Orders', Icon: ListChecks },
  { path: '/portefeuille', label: 'Portefeuille', Icon: Briefcase },
  { path: '/watchlist', label: 'Watchlist', Icon: Eye },
]

function isActive(pathname: string | null, path: string): boolean {
  if (!pathname) return false
  if (pathname === path) return true
  return pathname.startsWith(`${path}/`)
}

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Navigation principale"
      data-shell="MobileBottomNav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: 'rgba(251,249,244,0.92)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderTop: '1px solid var(--border-subtle)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          margin: 0,
          padding: 0,
          listStyle: 'none',
        }}
      >
        {TABS.map(({ path, label, Icon }) => {
          const active = isActive(pathname, path)
          return (
            <li key={path}>
              <Link
                href={path}
                aria-current={active ? 'page' : undefined}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  minHeight: 56,
                  padding: '8px 4px 10px',
                  color: active ? 'var(--forest-deep)' : 'var(--ink-muted)',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-editorial-sans)',
                  fontSize: 10,
                  fontWeight: active ? 600 : 500,
                  letterSpacing: '0.02em',
                  textAlign: 'center',
                }}
              >
                <Icon size={20} aria-hidden />
                <span>{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
