import { OpportunityOfTheDaySurface } from '@/components/mobile-v3/OpportunityOfTheDaySurface'
import { getOpportunityOfTheDay, type FxRates } from '@/lib/opportunityOfTheDay'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function AujourdhuiPage() {
  let payload = null
  let fxRates: FxRates = { EUR: 1 }
  let readError: string | null = null

  try {
    const result = await getOpportunityOfTheDay()
    payload = result.raw
    fxRates = result.fxRates
  } catch (error) {
    readError = error instanceof Error ? error.message : String(error)
    console.error('[/aujourdhui] opportunity of the day unavailable', error)
  }

  return (
    <OpportunityOfTheDaySurface payload={payload} error={readError} fxRates={fxRates} />
  )
}
