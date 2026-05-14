import { TodaySurface } from '@/components/mobile-v3/TodaySurface'

// Production Aujourd'hui surface. Mounts the unified TodaySurface so the
// page shares the exact same AppShell, MobileTopHeader, bottom nav and
// modal lifecycle as the rest of the v3 product (/sniper,
// /mobile-v3-preview, /mobile-v3-preview/sniper).
export default function AujourdhuiPage() {
  return <TodaySurface />
}
