import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { investmentTradeSchema } from "@/lib/validations/investment-trade"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未授权" }, { status: 401 })

  const trades = await prisma.investmentTrade.findMany({
    where: { userId: session.user.id },
    orderBy: { tradedAt: "desc" },
    include: { account: { select: { name: true } }, security: { select: { symbol: true, name: true } } },
  })
  return NextResponse.json(trades)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "未授权" }, { status: 401 })
    const data = investmentTradeSchema.parse(await request.json())
    const account = await prisma.financialAccount.findFirst({ where: { id: data.accountId, userId: session.user.id } })
    if (!account) return NextResponse.json({ error: "账户不存在" }, { status: 404 })

    const security = await prisma.security.upsert({
      where: { symbol_market: { symbol: data.symbol, market: data.market } },
      update: { name: data.name, bucket: data.bucket, currency: data.currency },
      create: { symbol: data.symbol, name: data.name, market: data.market, bucket: data.bucket, currency: data.currency },
    })

    const result = await prisma.$transaction(async (tx) => {
      const holding = await tx.holding.findUnique({ where: { accountId_securityId: { accountId: data.accountId, securityId: security.id } } })
      const quantity = Number(data.quantity)
      const price = Number(data.price)
      const fee = Number(data.fee || 0)
      let realizedProfit: number | null = null

      if (data.type === "SELL") {
        if (!holding || Number(holding.quantity) < quantity) throw new Error("卖出数量不能超过当前持仓")
        const averageCost = Number(holding.costAmount) / Number(holding.quantity)
        realizedProfit = quantity * price - fee - quantity * averageCost
        const remainingQuantity = Number(holding.quantity) - quantity
        if (remainingQuantity === 0) {
          await tx.holding.delete({ where: { id: holding.id } })
        } else {
          await tx.holding.update({ where: { id: holding.id }, data: { quantity: remainingQuantity, costAmount: remainingQuantity * averageCost } })
        }
      } else if (data.type === "BUY") {
        const buyCost = quantity * price + fee
        if (holding) {
          await tx.holding.update({ where: { id: holding.id }, data: { quantity: Number(holding.quantity) + quantity, costAmount: Number(holding.costAmount) + buyCost, costCurrency: data.currency } })
        } else {
          await tx.holding.create({ data: { userId: session.user.id, accountId: data.accountId, securityId: security.id, quantity, costAmount: buyCost, costCurrency: data.currency } })
        }
      }

      return tx.investmentTrade.create({ data: { userId: session.user.id, accountId: data.accountId, securityId: security.id, type: data.type, tradedAt: data.tradedAt, quantity, price, currency: data.currency, fee, realizedProfit, note: data.note } })
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "保存交易失败"
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
