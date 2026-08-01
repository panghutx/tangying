import { prisma } from "@/lib/prisma"
import { getExchangeRates } from "@/lib/services/exchange-rate"

export interface MonthlyCashFlow {
  month: string
  incomeCNY: number
  expenseCNY: number
  passiveIncomeCNY: number
  netCashFlowCNY: number
  savingsRate: number
  passiveCoverage: number
  freedomGapCNY: number
}

export interface CashFlowSummary {
  currentMonth: MonthlyCashFlow
  averageMonthlyIncomeCNY: number
  averageMonthlyExpenseCNY: number
  averageMonthlyNetCNY: number
  averageSavingsRate: number
  averagePassiveCoverage: number
  monthlyFreedomGapCNY: number
  trend: MonthlyCashFlow[]
}

export async function getCashFlowSummary(userId: string, months = 12): Promise<CashFlowSummary> {
  const monthStarts = buildMonthStarts(months)
  const startDate = monthStarts[0]
  const endDate = endOfMonth(monthStarts[monthStarts.length - 1])

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
      type: { in: ["INCOME", "DEPOSIT", "WITHDRAW"] },
    },
    select: {
      date: true,
      amount: true,
      type: true,
      account: {
        select: {
          currency: true,
        },
      },
    },
  })

  const currencies = [...new Set(transactions.map((transaction) => transaction.account.currency))]
  const rates = await getExchangeRates(currencies, "CNY")

  const rows = monthStarts.map((date) => ({
    month: formatMonthKey(date),
    incomeCNY: 0,
    expenseCNY: 0,
    passiveIncomeCNY: 0,
    netCashFlowCNY: 0,
    savingsRate: 0,
    passiveCoverage: 0,
    freedomGapCNY: 0,
  }))
  const rowByMonth = new Map(rows.map((row) => [row.month, row]))

  for (const transaction of transactions) {
    const row = rowByMonth.get(formatMonthKey(transaction.date))
    if (!row) continue

    const amountCNY = Number(transaction.amount) * (rates[transaction.account.currency] || 1)

    if (transaction.type === "WITHDRAW") {
      row.expenseCNY += amountCNY
    } else {
      row.incomeCNY += amountCNY
      if (transaction.type === "INCOME") {
        row.passiveIncomeCNY += amountCNY
      }
    }
  }

  for (const row of rows) {
    row.netCashFlowCNY = row.incomeCNY - row.expenseCNY
    row.savingsRate = row.incomeCNY > 0 ? (row.netCashFlowCNY / row.incomeCNY) * 100 : 0
    row.passiveCoverage = row.expenseCNY > 0 ? (row.passiveIncomeCNY / row.expenseCNY) * 100 : 0
    row.freedomGapCNY = Math.max(0, row.expenseCNY - row.passiveIncomeCNY)
  }

  const nonEmptyRows = rows.filter((row) => row.incomeCNY > 0 || row.expenseCNY > 0 || row.passiveIncomeCNY > 0)
  const averageBase = nonEmptyRows.length > 0 ? nonEmptyRows : rows
  const averageMonthlyIncomeCNY = average(averageBase.map((row) => row.incomeCNY))
  const averageMonthlyExpenseCNY = average(averageBase.map((row) => row.expenseCNY))
  const averageMonthlyNetCNY = average(averageBase.map((row) => row.netCashFlowCNY))
  const averageSavingsRate = averageMonthlyIncomeCNY > 0 ? (averageMonthlyNetCNY / averageMonthlyIncomeCNY) * 100 : 0
  const averagePassiveCoverage = averageMonthlyExpenseCNY > 0 ? (average(averageBase.map((row) => row.passiveIncomeCNY)) / averageMonthlyExpenseCNY) * 100 : 0

  return {
    currentMonth: rows[rows.length - 1],
    averageMonthlyIncomeCNY,
    averageMonthlyExpenseCNY,
    averageMonthlyNetCNY,
    averageSavingsRate,
    averagePassiveCoverage,
    monthlyFreedomGapCNY: Math.max(0, averageMonthlyExpenseCNY - average(averageBase.map((row) => row.passiveIncomeCNY))),
    trend: rows,
  }
}

function buildMonthStarts(months: number) {
  const count = Math.max(1, months)
  const now = new Date()
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(currentMonth)
    date.setMonth(currentMonth.getMonth() - (count - 1 - index))
    return date
  })
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
}

function formatMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function average(values: number[]) {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}
