import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { holdingSchema } from "@/lib/validations/holding"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const existing = await prisma.holding.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "持仓不存在" }, { status: 404 })
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

    const duplicate = await prisma.holding.findFirst({
      where: {
        id: { not: id },
        accountId: data.accountId,
        securityId: security.id,
        userId: session.user.id,
      },
    })

    if (duplicate) {
      return NextResponse.json({ error: "该账户下已有同一标的持仓" }, { status: 409 })
    }

    const holding = await prisma.holding.update({
      where: { id },
      data: {
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
    console.error("更新持仓失败:", error)
    return NextResponse.json({ error: "更新持仓失败" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const holding = await prisma.holding.findFirst({
      where: { id, userId: session.user.id },
      include: { security: true },
    })

    if (!holding) {
      return NextResponse.json({ error: "持仓不存在" }, { status: 404 })
    }

    const body = await request.json()
    const currency = String(body.currency || holding.security.currency).trim().toUpperCase()
    const marketValue = Number(body.marketValue || 0)
    const unitPrice = Number(body.unitPrice || 0)
    const quantity = Number(holding.quantity)
    const price = unitPrice > 0 ? unitPrice : marketValue > 0 && quantity > 0 ? marketValue / quantity : 0

    if (!price) {
      return NextResponse.json({ error: "请填写最新市值或单位价格" }, { status: 400 })
    }

    const quote = await prisma.priceQuote.create({
      data: {
        securityId: holding.securityId,
        price,
        currency,
        quotedAt: new Date(),
        source: "manual",
      },
    })

    return NextResponse.json(quote)
  } catch (error) {
    console.error("更新手动价格失败:", error)
    return NextResponse.json({ error: "更新手动价格失败" }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const holding = await prisma.holding.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!holding) {
      return NextResponse.json({ error: "持仓不存在" }, { status: 404 })
    }

    await prisma.holding.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除持仓失败:", error)
    return NextResponse.json({ error: "删除持仓失败" }, { status: 500 })
  }
}
