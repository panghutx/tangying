import { prisma } from "@/lib/prisma"

type CashFlow = { date: Date; amount: number }

function xnpv(rate: number, flows: CashFlow[]) {
  const start = flows[0]?.date.getTime() || 0
  return flows.reduce((sum, flow) => sum + flow.amount / Math.pow(1 + rate, (flow.date.getTime() - start) / 31536000000), 0)
}

function xirr(flows: CashFlow[]) {
  if (flows.length < 2 || !flows.some((flow) => flow.amount < 0) || !flows.some((flow) => flow.amount > 0)) return null
  let low = -0.9999
  let high = 10
  if (xnpv(high, flows) > 0) return null
  for (let index = 0; index < 100; index += 1) {
    const middle = (low + high) / 2
    if (xnpv(middle, flows) > 0) low = middle
    else high = middle
  }
  return ((low + high) / 2) * 100
}

export async function getInvestmentPerformance(userId: string, currentValueCNY: number) {
  const [trades, snapshots] = await Promise.all([
    prisma.investmentTrade.findMany({ where: { userId }, orderBy: { tradedAt: "asc" } }),
    prisma.asset.findMany({ where: { userId }, orderBy: { date: "asc" }, select: { date: true, amount: true, currency: true } }),
  ])
  const flows: CashFlow[] = trades.map((trade) => {
    const gross = Number(trade.quantity) * Number(trade.price)
    const fee = Number(trade.fee)
    const amount = trade.type === "BUY" ? -(gross + fee) : trade.type === "SELL" ? gross - fee : trade.type === "DIVIDEND" ? gross : -gross - fee
    return { date: trade.tradedAt, amount }
  })
  const firstDate = trades[0]?.tradedAt || snapshots[0]?.date
  const xirrValue = firstDate ? xirr([...flows, { date: new Date(), amount: currentValueCNY }]) : null

  let twrValue: number | null = null
  if (snapshots.length >= 2) {
    let linked = 1
    for (let index = 1; index < snapshots.length; index += 1) {
      const previous = Number(snapshots[index - 1].amount)
      const current = Number(snapshots[index].amount)
      const periodFlows = flows.filter((flow) => flow.date > snapshots[index - 1].date && flow.date <= snapshots[index].date)
      const netFlow = periodFlows.reduce((sum, flow) => sum - flow.amount, 0)
      if (previous > 0) linked *= (current - netFlow) / previous
    }
    twrValue = (linked - 1) * 100
  }

  return { xirr: xirrValue, twr: twrValue, tradeCount: trades.length, snapshotCount: snapshots.length }
}
