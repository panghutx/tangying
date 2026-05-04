import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transactionSchema } from "@/lib/validations/transaction"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: {
      userId: string
      accountId?: string
      type?: string
      date?: { gte?: Date; lte?: Date }
    } = { userId: session.user.id }

    if (accountId) where.accountId = accountId
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { name: true, platform: true, currency: true },
        },
      },
    })

    return NextResponse.json(
      transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      }))
    )
  } catch {
    return NextResponse.json(
      { error: "获取流水记录失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = transactionSchema.parse(body)

    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: data.accountId,
        userId: session.user.id,
        date: new Date(data.date),
        amount: data.amount,
        type: data.type,
        category: data.category,
        note: data.note,
        relatedAccountId: data.relatedAccountId,
      },
    })

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch {
    return NextResponse.json(
      { error: "创建流水记录失败" },
      { status: 500 }
    )
  }
}
