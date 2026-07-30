import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { holdingSchema } from "@/lib/validations/holding"
import { getPortfolioHoldings } from "@/lib/services/portfolio"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const portfolio = await getPortfolioHoldings(session.user.id)
    return NextResponse.json(portfolio)
  } catch (error) {
    console.error("获取持仓失败:", error)
    return NextResponse.json({ error: "获取持仓失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = holdingSchema.parse(body)

    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 })
    }

    const security = await prisma.security.upsert({
      where: {
        symbol_market: {
          symbol: data.symbol,
          market: data.market,
        },
      },
      update: {
        name: data.name,
        bucket: data.bucket,
        currency: data.currency,
      },
      create: {
        symbol: data.symbol,
        name: data.name,
        market: data.market,
        bucket: data.bucket,
        currency: data.currency,
      },
    })

    const holding = await prisma.holding.upsert({
      where: {
        accountId_securityId: {
          accountId: data.accountId,
          securityId: security.id,
        },
      },
      update: {
        quantity: data.quantity,
        costAmount: data.costAmount,
        costCurrency: data.costCurrency,
        note: data.note,
      },
      create: {
        userId: session.user.id,
        accountId: data.accountId,
        securityId: security.id,
        quantity: data.quantity,
        costAmount: data.costAmount,
        costCurrency: data.costCurrency,
        note: data.note,
      },
    })

    return NextResponse.json(holding)
  } catch (error) {
    console.error("保存持仓失败:", error)
    return NextResponse.json({ error: "保存持仓失败" }, { status: 500 })
  }
}
