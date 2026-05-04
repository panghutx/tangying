import { prisma } from "@/lib/prisma"
import { getExchangeRate } from "./exchange-rate"

export interface ProfitResult {
  accountId: string
  accountName: string
  currency: string
  startDate: Date
  endDate: Date
  startAsset: number
  endAsset: number
  assetChange: number
  totalDeposit: number
  totalWithdraw: number
  totalTransferIn: number
  totalTransferOut: number
  netInflow: number
  realProfit: number
  profitRate: number
}

export type PeriodType = "today" | "week" | "month" | "year" | "all" | "custom"

export function getDateRange(period: PeriodType, customStart?: Date, customEnd?: Date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case "today":
      return { start: today, end: now }
    case "week": {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
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
    case "custom":
      return { start: customStart || today, end: customEnd || now }
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

  // 获取期初资产（开始日期或之前最近的记录）
  const startAsset = await prisma.asset.findFirst({
    where: { accountId, date: { lte: startDate } },
    orderBy: { date: "desc" },
  })

  // 获取期末资产（结束日期或之前最近的记录）
  const endAsset = await prisma.asset.findFirst({
    where: { accountId, date: { lte: endDate } },
    orderBy: { date: "desc" },
  })

  // 获取期间的流水汇总
  const transactions = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      accountId,
      date: { gte: startDate, lte: endDate },
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
  const startAmount = Number(startAsset?.amount || 0)
  const endAmount = Number(endAsset?.amount || 0)
  const assetChange = endAmount - startAmount

  // 真实收益 = 资产变动 - 净流入
  const realProfit = assetChange - netInflow

  // 收益率
  const profitRate = startAmount > 0 ? (realProfit / startAmount) * 100 : 0

  return {
    accountId: account.id,
    accountName: account.name,
    currency: account.currency,
    startDate,
    endDate,
    startAsset: startAmount,
    endAsset: endAmount,
    assetChange,
    totalDeposit: totals.DEPOSIT,
    totalWithdraw: totals.WITHDRAW,
    totalTransferIn: totals.TRANSFER_IN,
    totalTransferOut: totals.TRANSFER_OUT,
    netInflow,
    realProfit,
    profitRate,
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
  let total = 0

  for (const profit of profits) {
    const rate = await getExchangeRate(profit.currency, "CNY")
    total += profit.realProfit * rate
  }

  return total
}