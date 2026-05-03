import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { accountSchema } from "@/lib/validations/account"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const accounts = await prisma.financialAccount.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { assets: true, incomes: true },
        },
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    return NextResponse.json(
      { error: "获取账户列表失败" },
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
    const data = accountSchema.parse(body)

    const account = await prisma.financialAccount.create({
      data: {
        ...data,
        userId: session.user.id,
      },
    })

    return NextResponse.json(account)
  } catch (error) {
    return NextResponse.json(
      { error: "创建账户失败" },
      { status: 500 }
    )
  }
}
