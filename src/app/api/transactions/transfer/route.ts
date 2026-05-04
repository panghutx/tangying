import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transferSchema } from "@/lib/validations/transaction"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = transferSchema.parse(body)

    if (data.fromAccountId === data.toAccountId) {
      return NextResponse.json(
        { error: "转出和转入账户不能相同" },
        { status: 400 }
      )
    }

    // 验证两个账户都属于当前用户
    const accounts = await prisma.financialAccount.findMany({
      where: {
        id: { in: [data.fromAccountId, data.toAccountId] },
        userId: session.user.id,
      },
    })

    if (accounts.length !== 2) {
      return NextResponse.json(
        { error: "账户不存在或不属于当前用户" },
        { status: 404 }
      )
    }

    // 在事务中创建两条转账记录
    const [transferOut, transferIn] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          accountId: data.fromAccountId,
          userId: session.user.id,
          date: new Date(data.date),
          amount: data.fromAmount,
          type: "TRANSFER_OUT",
          note: data.note,
          relatedAccountId: data.toAccountId,
        },
      }),
      prisma.transaction.create({
        data: {
          accountId: data.toAccountId,
          userId: session.user.id,
          date: new Date(data.date),
          amount: data.toAmount,
          type: "TRANSFER_IN",
          note: data.note,
          relatedAccountId: data.fromAccountId,
        },
      }),
    ])

    return NextResponse.json({
      transferOut: { ...transferOut, amount: Number(transferOut.amount) },
      transferIn: { ...transferIn, amount: Number(transferIn.amount) },
    })
  } catch {
    return NextResponse.json(
      { error: "创建转账记录失败" },
      { status: 500 }
    )
  }
}
