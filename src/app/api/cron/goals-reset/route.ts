import { NextResponse } from 'next/server'
import { runMonthlyGoalReset } from '@/lib/services/goal-cron'

// This endpoint should be protected and called by a cron service
export async function POST() {
  try {
    await runMonthlyGoalReset()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Goal reset failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}