import { SniperSurface } from '@/components/mobile-v3/SniperSurface'

// Lab path — kept alive for UX iteration. Mounts the exact same
// SniperSurface as the production /sniper route, so /mobile-v3-preview
// and /sniper share the same shell, bottom nav and lifecycle.
export default function SniperPreviewPage() {
  return <SniperSurface />
}
