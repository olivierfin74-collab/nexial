// Mobile app shell.
//
// Wraps a page's content and mounts the bottom navigation. The shell adds
// enough bottom padding so that nothing scrolls beneath the fixed nav and
// keeps the iPhone safe-area inset reserved. A discreet build-version
// badge sits just above the bottom nav so Olivier can confirm which
// deploy is running from any v3 surface.
//
// No header is rendered here — by design. Pages stay responsible for their
// own header / hero / loading states.

import type { ReactNode } from 'react'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileVersionBadge } from './MobileVersionBadge'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div
      data-shell="AppShell"
      style={{
        minHeight: '100vh',
        background: '#FBF9F4',
        paddingBottom: 'calc(72px + env(safe-area-inset-bottom))',
      }}
    >
      {children}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 'calc(72px + env(safe-area-inset-bottom) + 6px)',
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 49,
        }}
      >
        <MobileVersionBadge variant="footer" />
      </div>
      <MobileBottomNav />
    </div>
  )
}
