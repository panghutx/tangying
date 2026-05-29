import { prisma } from "@/lib/prisma"
import { getExchangeRates } from "./exchange-rate"

export interface ProfitResult {
  accountId: string
  accountName: string
  currency: string
  startDate: Date
  endDate: Date
  startAssetDate: Date | null
  endAssetDate: Date | null
  netInflowStartDate: Date
  startAsset: number
  endAsset: number
  assetChange: number
  totalDeposit: number
  totalWithdraw: number
  totalTransferIn: number
  totalTransferOut: number
  totalIncome: number
  netInflow: number
  realProfit: number
  profitRate: number
  hasValidData: boolean  // 是否有有效的期初数据
}

export type PeriodType = "today" | "week" | "month" | "year" | "all" | "custom"

export function getWeekBoundary(weekOffset: number = 0) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const dayOfWeek = today.getDay()
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  // Get Monday of target week
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - daysToSubtract - (weekOffset * 7))

  // Get Sunday
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  return { start: weekStart, end: weekEnd }
}

export function getDateRange(period: PeriodType, customStart?: Date, customEnd?: Date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case "today":
      return { start: today, end: now }
    case "week": {
      const weekStart = new Date(today)
      const dayOfWeek = weekStart.getDay()
      const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart.setDate(weekStart.getDate() - daysToSubtract)
      return { start: weekStart, end: now }
    }
    case "month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: monthStart, end: now }
    }
    case "year": {
      const yearStart = new Date(today.getFullYear(), 0, 1)
      return { start: yearStart, end: now }
    }
    case "all": {
      return { start: new Date("1970-01-01"), end: now }
    }
    case "custom": {
      if (customStart && customEnd && customStart > customEnd) {
        throw new Error("customStart must be before or equal to customEnd")
      }
      return { start: customStart || today, end: customEnd || now }
    }
    default:
      return { start: today, end: now }
  }
}

export async function calculateAccountProfit(
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<ProfitResult | null> {
  // 获取账户信息
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, name: true, currency: true },
  })

  if (!account) return null

  // 获取期末资产（结束日期或之前最近的记录）
  const endAsset = await prisma.asset.findFirst({
    where: { accountId, date: { lte: endDate } },
    orderBy: { date: "desc" },
  })

  // 如果没有期末资产记录，说明这个账户没有数据，返回 null
  if (!endAsset) return null

  // 期初资产：优先取期间开始之前的最近记录，如果没有则取期间内最早的记录
  let startAssetRecord = await prisma.asset.findFirst({
    where: { accountId, date: { lte: startDate } },
    orderBy: { date: "desc" },
  })

  // 如果期间开始之前没有记录，取期间内最早的记录
  if (!startAssetRecord) {
    startAssetRecord = await prisma.asset.findFirst({
      where: { accountId, date: { gte: startDate, lte: endDate } },
      orderBy: { date: "asc" },
    })
  }

  const startAmount = startAssetRecord ? Number(startAssetRecord.amount) : 0
  const endAmount = Number(endAsset.amount)

  // 获取期间的流水汇总（从期初资产日期到期末资产日期）
  const actualStartDate = startAssetRecord?.date || startDate
  const transactions = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      accountId,
      date: { gte: actualStartDate, lte: endDate },
    },
    _sum: { amount: true },
  })

  // 计算各类流水总额
  const totals = {
    DEPOSIT: 0,
    WITHDRAW: 0,
    TRANSFER_IN: 0,
    TRANSFER_OUT: 0,
    INCOME: 0,
  }

  for (const t of transactions) {
    const amount = Number(t._sum.amount || 0)
    if (t.type in totals) {
      totals[t.type as keyof typeof totals] = amount
    }
  }

  // 净流入 = 存入 + 转入 - 取出 - 转出（INCOME 不计入净流入）
  const netInflow =
    totals.DEPOSIT + totals.TRANSFER_IN - totals.WITHDRAW - totals.TRANSFER_OUT

  // 资产变动
  const assetChange = endAmount - startAmount

  // 判断是否有有效的期初数据
  const hasValidData = startAssetRecord !== null

  // 真实收益 = 资产变动 - 净流入
  const realProfit = hasValidData ? assetChange - netInflow : 0

  // 收益率
  const profitRate = startAmount > 0 ? (realProfit / startAmount) * 100 : 0

  return {
    accountId: account.id,
    accountName: account.name,
    currency: account.currency,
    startDate,
    endDate,
    startAssetDate: startAssetRecord?.date || null,
    endAssetDate: endAsset.date,
    netInflowStartDate: actualStartDate,
    startAsset: startAmount,
    endAsset: endAmount,
    assetChange,
    totalDeposit: totals.DEPOSIT,
    totalWithdraw: totals.WITHDRAW,
    totalTransferIn: totals.TRANSFER_IN,
    totalTransferOut: totals.TRANSFER_OUT,
    totalIncome: totals.INCOME,
    netInflow,
    realProfit,
    profitRate,
    hasValidData,
  }
}

export async function calculateAllProfits(
  userId: string,
  period: PeriodType,
  customStart?: Date,
  customEnd?: Date
): Promise<ProfitResult[]> {
  const { start, end } = getDateRange(period, customStart, customEnd)

  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  })

  const results: ProfitResult[] = []

  for (const account of accounts) {
    const profit = await calculateAccountProfit(account.id, start, end)
    if (profit) {
      results.push(profit)
    }
  }

  return results
}

export async function getTotalProfitCNY(
  profits: ProfitResult[]
): Promise<number> {
  if (profits.length === 0) return 0

  const currencies = [...new Set(profits.map((p) => p.currency))]
  const rates = await getExchangeRates(currencies, "CNY")

  return profits.reduce((total, profit) => {
    const rate = rates[profit.currency] || 1
    return total + profit.realProfit * rate
  }, 0)
}

export async function getTransactionsByAccount(
  accountId: string,
  startDate: Date,
  endDate: Date
) {
  const transactions = await prisma.transaction.findMany({
    where: {
      accountId,
      date: { gte: startDate, lte: endDate },
    },
    orderBy: { date: "desc" },
    include: {
      relatedAccount: { select: { name: true } },
    },
  })
  return transactions
}