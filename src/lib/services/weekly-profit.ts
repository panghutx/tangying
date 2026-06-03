import { prisma } from "@/lib/prisma"
import { calculateAccountProfit, getWeekBoundary } from "./profit"
import { getExchangeRates } from "./exchange-rate"

export interface WeeklyProfitRecord {
  accountId: string
  accountName: string
  currency: string
  weekStartDate: Date
  weekEndDate: Date
  startAsset: number
  endAsset: number
  startAssetDate: Date | null
  endAssetDate: Date | null
  totalDeposit: number
  totalWithdraw: number
  totalTransferIn: number
  totalTransferOut: number
  totalIncome: number
  netInflow: number
  realProfit: number
  profitRate: number
  hasValidData: boolean
}

export async function calculateWeeklyProfit(
  accountId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<WeeklyProfitRecord | null> {
  const profit = await calculateAccountProfit(accountId, weekStart, weekEnd)
  if (!profit) return null

  return {
    accountId: profit.accountId,
    accountName: profit.accountName,
    currency: profit.currency,
    weekStartDate: weekStart,
    weekEndDate: weekEnd,
    startAsset: profit.startAsset,
    endAsset: profit.endAsset,
    startAssetDate: profit.startAssetDate,
    endAssetDate: profit.endAssetDate,
    totalDeposit: profit.totalDeposit,
    totalWithdraw: profit.totalWithdraw,
    totalTransferIn: profit.totalTransferIn,
    totalTransferOut: profit.totalTransferOut,
    totalIncome: profit.totalIncome,
    netInflow: profit.netInflow,
    realProfit: profit.realProfit,
    profitRate: profit.profitRate,
    hasValidData: profit.hasValidData,
  }
}

export async function saveWeeklyProfits(weekOffset: number = 1) {
  const { start: weekStart, end: weekEnd } = getWeekBoundary(weekOffset)

  // Get all active users
  const users = await prisma.user.findMany({
    select: { id: true },
  })

  let savedCount = 0

  for (const user of users) {
    // Get all active accounts for this user
    const accounts = await prisma.financialAccount.findMany({
      where: { userId: user.id, isActive: true },
      select: { id: true },
    })

    for (const account of accounts) {
      const profit = await calculateWeeklyProfit(account.id, weekStart, weekEnd)
      if (!profit) continue

      await prisma.weeklyProfit.upsert({
        where: {
          accountId_weekStartDate: {
            accountId: account.id,
            weekStartDate: weekStart,
          },
        },
        update: {
          endAsset: profit.endAsset,
          endAssetDate: profit.endAssetDate,
          totalDeposit: profit.totalDeposit,
          totalWithdraw: profit.totalWithdraw,
          totalTransferIn: profit.totalTransferIn,
          totalTransferOut: profit.totalTransferOut,
          totalIncome: profit.totalIncome,
          netInflow: profit.netInflow,
          realProfit: profit.realProfit,
          profitRate: profit.profitRate,
          hasValidData: profit.hasValidData,
        },
        create: {
          userId: user.id,
          accountId: profit.accountId,
          weekStartDate: weekStart,
          weekEndDate: weekEnd,
          startAsset: profit.startAsset,
          endAsset: profit.endAsset,
          startAssetDate: profit.startAssetDate,
          endAssetDate: profit.endAssetDate,
          totalDeposit: profit.totalDeposit,
          totalWithdraw: profit.totalWithdraw,
          totalTransferIn: profit.totalTransferIn,
          totalTransferOut: profit.totalTransferOut,
          totalIncome: profit.totalIncome,
          netInflow: profit.netInflow,
          realProfit: profit.realProfit,
          profitRate: profit.profitRate,
          currency: profit.currency,
          hasValidData: profit.hasValidData,
        },
      })
      savedCount++
    }
  }

  return { weekStartDate: weekStart, weekEndDate: weekEnd, savedCount }
}

export async function getWeeklyProfitsFromDB(
  userId: string,
  weekOffset: number = 1
): Promise<WeeklyProfitRecord[]> {
  const { start: weekStart, end: weekEnd } = getWeekBoundary(weekOffset)

  const profits = await prisma.weeklyProfit.findMany({
    where: {
      userId,
      weekStartDate: weekStart,
    },
    include: {
      account: { select: { name: true } },
    },
  })

  return profits.map((p) => ({
    accountId: p.accountId,
    accountName: p.account.name,
    currency: p.currency,
    weekStartDate: p.weekStartDate,
    weekEndDate: p.weekEndDate,
    startAsset: Number(p.startAsset),
    endAsset: Number(p.endAsset),
    startAssetDate: p.startAssetDate,
    endAssetDate: p.endAssetDate,
    totalDeposit: Number(p.totalDeposit),
    totalWithdraw: Number(p.totalWithdraw),
    totalTransferIn: Number(p.totalTransferIn),
    totalTransferOut: Number(p.totalTransferOut),
    totalIncome: Number(p.totalIncome),
    netInflow: Number(p.netInflow),
    realProfit: Number(p.realProfit),
    profitRate: Number(p.profitRate),
    hasValidData: p.hasValidData,
  }))
}

export async function getRecentWeeklyProfits(
  userId: string,
  weeks: number = 8
) {
  const results: Array<{
    weekStartDate: Date
    weekEndDate: Date
    profits: WeeklyProfitRecord[]
    totalProfitCNY: number
  }> = []

  for (let i = 1; i <= weeks; i++) {
    const profits = await getWeeklyProfitsFromDB(userId, i)
    if (profits.length === 0) continue

    const currencies = [...new Set(profits.map((p) => p.currency))]
    const rates = await getExchangeRates(currencies, "CNY")
    const totalProfitCNY = profits.reduce((total, profit) => {
      const rate = rates[profit.currency] || 1
      return total + profit.realProfit * rate
    }, 0)

    results.push({
      weekStartDate: profits[0].weekStartDate,
      weekEndDate: profits[0].weekEndDate,
      profits,
      totalProfitCNY,
    })
  }

  return results
}

export interface CalendarDay {
  date: string
  profit: number
  hasData: boolean
}

export interface CalendarWeekAccount {
  accountId: string
  accountName: string
  currency: string
  realProfit: number
  profitRate: number
}

export interface CalendarWeek {
  weekNumber: number
  weekStart: string
  weekEnd: string
  days: CalendarDay[]
  totalProfit: number
  profitRate: number
  hasData: boolean
  profits: CalendarWeekAccount[]
}

export interface CalendarMonth {
  month: string
  monthName: string
  weeks: CalendarWeek[]
  monthTotalProfit: number
  monthProfitRate: number
}

export async function getCalendarData(userId: string, months: number = 6) {
  const results: CalendarMonth[] = []
  const now = new Date()

  for (let m = 0; m < months; m++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth() - m, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    const monthName = `${month + 1}月`

    // Get all weeks in this month
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const weeks: CalendarWeek[] = []
    let weekTotalProfit = 0
    let weekCount = 0

    // Iterate through each day to find week starts (Mondays)
    const dayOfWeek = firstDay.getDay()
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
    const firstMonday = new Date(firstDay)
    firstMonday.setDate(firstDay.getDate() - daysToSubtract)

    let currentWeekStart = new Date(firstMonday)

    while (currentWeekStart <= lastDay) {
      const weekEnd = new Date(currentWeekStart)
      weekEnd.setDate(currentWeekStart.getDate() + 6)

      // Get weekly profit for this week
      const weekOffset = Math.floor((now.getTime() - currentWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000))
      const weeklyProfits = await getWeeklyProfitsFromDB(userId, weekOffset)

      // Calculate week profit
      let weekProfit = 0
      let weekTotalStartAsset = 0  // 用于计算加权收益率
      let hasData = false

      if (weeklyProfits.length > 0) {
        const currencies = [...new Set(weeklyProfits.map((p) => p.currency))]
        const rates = await getExchangeRates(currencies, "CNY")

        // 换算成 CNY 后的总收益
        weekProfit = weeklyProfits.reduce((total, profit) => {
          const rate = rates[profit.currency] || 1
          return total + profit.realProfit * rate
        }, 0)

        // 换算成 CNY 后的总期初资产（用于计算加权收益率）
        weekTotalStartAsset = weeklyProfits.reduce((total, profit) => {
          const rate = rates[profit.currency] || 1
          return total + profit.startAsset * rate
        }, 0)

        hasData = weeklyProfits.some((p) => p.hasValidData)
        weekTotalProfit += weekProfit
        weekCount++
      }

      // 收益率 = 总收益 / 总期初资产（加权平均）
      const weekRate = weekTotalStartAsset > 0 ? (weekProfit / weekTotalStartAsset) * 100 : 0

      // Generate days for this week
      const days: CalendarDay[] = []
      for (let d = 0; d < 7; d++) {
        const dayDate = new Date(currentWeekStart)
        dayDate.setDate(currentWeekStart.getDate() + d)
        const dateStr = dayDate.toISOString().split("T")[0]

        // Check if this day has asset data
        const dayAsset = await prisma.asset.findFirst({
          where: {
            userId,
            date: dayDate,
          },
        })

        days.push({
          date: dateStr,
          profit: dayAsset ? Number(dayAsset.amount) : 0,
          hasData: !!dayAsset,
        })
      }

      weeks.push({
        weekNumber: weeks.length + 1,
        weekStart: currentWeekStart.toISOString().split("T")[0],
        weekEnd: weekEnd.toISOString().split("T")[0],
        days,
        totalProfit: weekProfit,
        profitRate: weekRate,
        hasData,
        profits: weeklyProfits.map((p) => ({
          accountId: p.accountId,
          accountName: p.accountName,
          currency: p.currency,
          realProfit: p.realProfit,
          profitRate: p.profitRate,
        })) || [],
      })

      // Move to next week
      currentWeekStart = new Date(currentWeekStart)
      currentWeekStart.setDate(currentWeekStart.getDate() + 7)
    }

    results.push({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      monthName,
      weeks,
      monthTotalProfit: weekTotalProfit,
      monthProfitRate: weekCount > 0 ? weekTotalProfit / weekCount : 0,
    })
  }

  return results
}
