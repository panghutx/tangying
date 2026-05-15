import { prisma } from '@/lib/prisma'
import { calculateGoalProgress, recordGoalProgress, updateGoal } from './goal'

/**
 * Monthly reset for profit goals:
 * - Check each ACTIVE profit goal with MONTHLY period
 * - If completed (currentAmount >= targetAmount) → mark COMPLETED
 * - If not completed → mark FAILED
 * - Create new period record with 0 progress
 */
export async function runMonthlyGoalReset() {
  const now = new Date()

  // Get all active monthly profit goals
  const monthlyProfitGoals = await prisma.goal.findMany({
    where: {
      type: 'PROFIT',
      period: 'MONTHLY',
      status: 'ACTIVE',
    },
  })

  for (const goal of monthlyProfitGoals) {
    // Calculate current period's progress
    const currentAmount = await calculateGoalProgress(goal.id)

    if (currentAmount >= Number(goal.targetAmount)) {
      // Goal achieved
      await updateGoal(goal.id, { status: 'COMPLETED', completedAt: new Date() })
    } else {
      // Failed for this period
      await updateGoal(goal.id, { status: 'FAILED' })
    }
  }

  console.log(`Processed ${monthlyProfitGoals.length} monthly profit goals`)
}

/**
 * Record daily progress for all active goals
 * Should be called daily via cron
 */
export async function recordAllGoalProgress() {
  const activeGoals = await prisma.goal.findMany({
    where: { status: 'ACTIVE' },
  })

  for (const goal of activeGoals) {
    const currentAmount = await calculateGoalProgress(goal.id)
    await recordGoalProgress(goal.id, currentAmount)
  }

  console.log(`Recorded progress for ${activeGoals.length} goals`)
}

// Export for use in cron job setup
export { runMonthlyGoalReset as handler }