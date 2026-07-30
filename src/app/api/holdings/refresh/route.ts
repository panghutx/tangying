import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { refreshSecurityQuote } from "@/lib/services/quotes"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const holdings = await prisma.holding.findMany({
      where: { userId: session.user.id },
      select: { securityId: true },
      distinct: ["securityId"],
    })

    const securities = await prisma.security.findMany({
      where: { id: { in: holdings.map((holding) => holding.securityId) } },
      select: { id: true, symbol: true, market: true },
    })
    const securityById = new Map(securities.map((security) => [security.id, security]))
    const refreshableHoldings = holdings.filter((holding) => {
      const security = securityById.get(holding.securityId)
      return security && !["OTHER", "CASH"].includes(security.market)
    })
    const skipped = holdings.length - refreshableHoldings.length

    const results = await Promise.allSettled(
      refreshableHoldings.map(async (holding) => {
        const quote = await refreshSecurityQuote(holding.securityId)
        return {
          securityId: holding.securityId,
          price: Number(quote.price),
          currency: quote.currency,
          quotedAt: quote.quotedAt,
        }
      })
    )

    const success = results.filter((result) => result.status === "fulfilled").length
    const failed = results.length - success
    const details = results.map((result, index) => {
      const securityId = refreshableHoldings[index]?.securityId
      const security = securityById.get(securityId)

      if (result.status === "fulfilled") {
        return {
          securityId,
          symbol: security?.symbol,
          status: "success",
          price: result.value.price,
          currency: result.value.currency,
          quotedAt: result.value.quotedAt,
        }
      }

      return {
        securityId,
        symbol: security?.symbol,
        status: "failed",
        message: result.reason instanceof Error ? result.reason.message : String(result.reason),
      }
    })

    return NextResponse.json({ total: holdings.length, refreshable: refreshableHoldings.length, skipped, success, failed, details })
  } catch (error) {
    console.error("刷新行情失败:", error)
    return NextResponse.json({ error: "刷新行情失败" }, { status: 500 })
  }
}
