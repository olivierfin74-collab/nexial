import { WatchlistSurface } from '@/components/mobile-v3/WatchlistSurface'

// Real Watchlist surface restored from the legacy WatchlistPage /
// WatchlistItemRow pattern (nexial-app-complete.jsx) into the unified
// v3 AppShell. Read-only (Phase 1): switcher + filter chips + items.
export default function WatchlistPage() {
  return <WatchlistSurface />
}
