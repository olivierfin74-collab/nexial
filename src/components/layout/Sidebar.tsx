'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

const menu = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Actions', href: '/actions', icon: '⚡' },
  { name: 'Alerts', href: '/alerts', icon: '🚨' },
  { name: 'Portfolio', href: '/portfolio', icon: '💼' },
  { name: 'Allocation', href: '/allocation', icon: '🧭' },
  { name: 'Watchlist', href: '/watchlist', icon: '👁️' },
  { name: 'Performance', href: '/performance', icon: '📈' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`transition-all duration-300 border-r border-white/10 bg-[#182441] ${
        collapsed ? 'w-[80px]' : 'w-[240px]'
      }`}
    >
      <div className="flex items-center justify-between px-4 py-4">
        {!collapsed && (
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">
              Nexial
            </p>
            <p className="text-sm text-blue-100">Execution Engine</p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg bg-white/10 px-2 py-1 text-sm hover:bg-white/20"
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav className="mt-4 flex flex-col gap-2 px-2">
        {menu.map((item) => {
          const active = pathname === item.href

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                active
                  ? 'bg-cyan-300/20 text-cyan-100'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <span className="text-lg">{item.icon}</span>

              {!collapsed && (
                <span className="text-sm font-medium">{item.name}</span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}