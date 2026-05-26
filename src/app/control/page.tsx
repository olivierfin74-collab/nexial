import { ControlSurface } from '@/components/control/ControlSurface'
import { getControlDataFreshness, getControlFeed, getControlVerdict } from '@/lib/control/queries'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ControlPage() {
  let error: string | null = null

  const [verdictResult, feedResult, freshnessResult] = await Promise.allSettled([
    getControlVerdict(),
    getControlFeed(),
    getControlDataFreshness(),
  ])

  const verdict = verdictResult.status === 'fulfilled' ? verdictResult.value : null
  const feed = feedResult.status === 'fulfilled' ? feedResult.value : []
  const dataFreshness = freshnessResult.status === 'fulfilled' ? freshnessResult.value : []

  if (verdictResult.status === 'rejected') {
    error = verdictResult.reason instanceof Error ? verdictResult.reason.message : String(verdictResult.reason)
    console.error('[CONTROL][vw_control_verdict] query unavailable', verdictResult.reason)
  } else if (feedResult.status === 'rejected') {
    error = feedResult.reason instanceof Error ? feedResult.reason.message : String(feedResult.reason)
    console.error('[CONTROL][vw_control_feed] query unavailable', feedResult.reason)
  } else if (freshnessResult.status === 'rejected') {
    error = freshnessResult.reason instanceof Error ? freshnessResult.reason.message : String(freshnessResult.reason)
    console.error('[CONTROL][vw_control_data_freshness] query unavailable', freshnessResult.reason)
  }

  return <ControlSurface verdict={verdict} feed={feed} dataFreshness={dataFreshness} error={error} now={new Date()} />
}
