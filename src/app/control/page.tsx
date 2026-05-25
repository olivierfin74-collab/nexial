import { ControlSurface } from '@/components/control/ControlSurface'
import { getControlFeed, getControlVerdict } from '@/lib/control/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ControlPage() {
  let error: string | null = null

  const [verdictResult, feedResult] = await Promise.allSettled([
    getControlVerdict(),
    getControlFeed(),
  ])

  const verdict = verdictResult.status === 'fulfilled' ? verdictResult.value : null
  const feed = feedResult.status === 'fulfilled' ? feedResult.value : []

  if (verdictResult.status === 'rejected') {
    error = verdictResult.reason instanceof Error ? verdictResult.reason.message : String(verdictResult.reason)
    console.error('[CONTROL][vw_control_verdict] query unavailable', verdictResult.reason)
  } else if (feedResult.status === 'rejected') {
    error = feedResult.reason instanceof Error ? feedResult.reason.message : String(feedResult.reason)
    console.error('[CONTROL][vw_control_feed] query unavailable', feedResult.reason)
  }

  return <ControlSurface verdict={verdict} feed={feed} error={error} now={new Date()} />
}
