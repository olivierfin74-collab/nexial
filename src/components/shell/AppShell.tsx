// Mobile app shell.
//
// Wraps a page's content and mounts the bottom navigation. The shell adds
// enough bottom padding so that nothing scrolls beneath the fixed nav and
// keeps the iPhone safe-area inset reserved.
//
// No header is rendered here — by design. Pages stay responsible for their
// own header / hero / loading states.

import type { ReactNode } from 'react'
import { MobileBottomNav } from './MobileBottomNav'

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
      <MobileBottomNav />
    </div>
  )
}
