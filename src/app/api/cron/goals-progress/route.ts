import { NextResponse } from 'next/server'
import { recordAllGoalProgress } from '@/lib/services/goal-cron'

export async function POST() {
  try {
    await recordAllGoalProgress()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Progress recording failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
