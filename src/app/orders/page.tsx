import { OrdersSurface } from '@/components/mobile-v3/OrdersSurface'

// Real Orders surface restored from the legacy OrdersPage / OrderRow
// pattern (nexial-app-complete.jsx) into the unified v3 AppShell.
// Read-only restoration: filter chips + grouping by ticker + status
// rows. Manual order creation and execution dispatch stay legacy for
// now — phase 1 is "lecture excellente".
export default function OrdersPage() {
  return <OrdersSurface />
}
