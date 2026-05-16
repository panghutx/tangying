'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type GoalType = 'ASSET' | 'PROFIT'
export type GoalPeriod = 'MONTHLY' | 'YEARLY'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ARCHIVED'

export interface CreateGoalInput {
  userId: string
  type: GoalType
  name: string
  targetAmount: number
  period?: GoalPeriod
  deadline?: Date
}

export async function createGoal(input: CreateGoalInput) {
  const goal = await prisma.goal.create({
    data: {
      userId: input.userId,
      type: input.type,
      name: input.name,
      targetAmount: input.targetAmount,
      period: input.period,
      deadline: input.deadline ? new Date(input.deadline) : null,
      status: 'ACTIVE',
    },
  })

  revalidatePath('/goals')
  revalidatePath('/')

  return goal
}

// Get goals for a user
export async function getGoals(userId: string, status?: GoalStatus) {
  return prisma.goal.findMany({
    where: { userId, ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
  })
}

// Get single goal
export async function getGoal(id: string) {
  return prisma.goal.findUnique({ where: { id } })
}

// Update goal
export async function updateGoal(id: string, data: Partial<CreateGoalInput>) {
  const goal = await prisma.goal.update({
    where: { id },
    data,
  })
  revalidatePath('/goals')
  revalidatePath('/')
  return goal
}

// Archive goal
export async function archiveGoal(id: string) {
  return updateGoal(id, { status: 'ARCHIVED' })
}

// Calculate current progress for a goal
export async function calculateGoalProgress(goalId: string) {
  const goal = await getGoal(goalId)
  if (!goal) throw new Error('Goal not found')

  if (goal.type === 'ASSET') {
    // Sum latest assets for user across all accounts, converted to CNY
    const assets = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON ("accountId")
          "accountId", amount, currency
        FROM assets
        WHERE "userId" = ${goal.userId}
        ORDER BY "accountId", date DESC
      )
      SELECT amount, currency FROM latest
    `
    // Convert to CNY and sum (simplified - uses hardcoded rates)
    const rates: Record<string, number> = { USD: 6.8, HKD: 0.868, CNY: 1 }
    const total = (assets as { amount: bigint; currency: string }[])
      .reduce((sum, a) => sum + Number(a.amount) * (rates[a.currency] || 1), 0)
    return total
  } else {
    // Profit goal: sum realProfit for current period, converted to CNY
    const period = goal.period === 'MONTHLY' ? 'month' : 'year'
    const { calculateAllProfits } = await import('./profit')
    const profits = await calculateAllProfits(goal.userId, period)

    // Convert each profit to CNY before summing
    const currencies = [...new Set(profits.map((p) => p.currency))]
    const { getExchangeRates } = await import('./exchange-rate')
    const rates = await getExchangeRates(currencies, 'CNY')

    return profits.reduce((total, profit) => {
      const rate = rates[profit.currency] || 1
      return total + profit.realProfit * rate
    }, 0)
  }
}

// Record daily progress snapshot
export async function recordGoalProgress(goalId: string, amount: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return prisma.goalProgress.upsert({
    where: { goalId_date: { goalId, date: today } },
    create: { goalId, date: today, currentAmount: amount },
    update: { currentAmount: amount },
  })
}

// Get progress history
export async function getGoalProgressHistory(goalId: string) {
  return prisma.goalProgress.findMany({
    where: { goalId },
    orderBy: { date: 'asc' },
  })
}