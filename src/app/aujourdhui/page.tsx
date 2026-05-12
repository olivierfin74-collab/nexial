'use client'

import NexialApp from '../../../nexial-app-complete'
import FlashDropEventsStrip from '@/components/FlashDropEventsStrip'
import MorningBriefCard from '@/components/MorningBriefCard'

export default function AujourdhuiPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBF9F4' }}>
      <MorningBriefCard />
      <FlashDropEventsStrip />
      <NexialApp />
    </div>
  )
}
