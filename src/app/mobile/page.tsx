// P-CUT-1 — /mobile is now the v3 decisional product.
//
// The route redirects to /aujourdhui where the V2.2 DecisionalInbox is
// already wired through the AppShell + bottom nav. The legacy NexialApp
// content is no longer the entry point for mobile traffic.
//
// Other surfaces (Portefeuille / Watchlist / Ordres / Réglages) remain
// legacy through their own routes and are reachable via the bottom nav.

import { redirect } from 'next/navigation'

export default function MobilePage() {
  redirect('/aujourdhui')
}
