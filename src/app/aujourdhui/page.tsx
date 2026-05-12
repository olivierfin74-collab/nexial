'use client'

import NexialApp from '../../../nexial-app-complete'
import FlashDropEventsStrip from '@/components/FlashDropEventsStrip'

export default function AujourdhuiPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBF9F4' }}>
      <FlashDropEventsStrip />
      <NexialApp />
    </div>
  )
}
