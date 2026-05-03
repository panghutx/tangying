import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { incomeSchema } from "@/lib/validations/income"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    const where: { userId: string; accountId?: string } = { userId: session.user.id }
    if (accountId) {
      where.accountId = accountId
    }

    const incomes = await prisma.income.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { name: true, platform: true },
        },
      },
    })

    return NextResponse.json(incomes)
  } catch {
    return NextResponse.json(
      { error: "获取收益记录失败" },
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
    const data = incomeSchema.parse(body)

    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 })
    }

    const income = await prisma.income.create({
      data: {
        accountId: data.accountId,
        userId: session.user.id,
        date: new Date(data.date),
        amount: data.amount,
        type: data.type,
        note: data.note,
      },
    })

    return NextResponse.json(income)
  } catch {
    return NextResponse.json(
      { error: "创建收益记录失败" },
      { status: 500 }
    )
  }
}
