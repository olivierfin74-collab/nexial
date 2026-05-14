import { DashboardSurface } from '@/components/mobile-v3/DashboardSurface'

// Real Dashboard surface: patrimoine + cash + per-account breakdown.
// Mounts inside the unified v3 AppShell. No legacy NexialApp.
export default function DashboardPage() {
  return <DashboardSurface />
}
