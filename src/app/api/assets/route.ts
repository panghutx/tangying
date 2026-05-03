import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { assetSchema } from "@/lib/validations/asset"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    const where: any = { userId: session.user.id }
    if (accountId) {
      where.accountId = accountId
    }

    const assets = await prisma.asset.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { name: true, platform: true },
        },
      },
    })

    return NextResponse.json(assets)
  } catch (error) {
    return NextResponse.json(
      { error: "获取资产记录失败" },
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
    const data = assetSchema.parse(body)

    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 })
    }

    const asset = await prisma.asset.create({
      data: {
        accountId: data.accountId,
        userId: session.user.id,
        date: new Date(data.date),
        amount: data.amount,
        currency: data.currency,
        note: data.note,
      },
    })

    return NextResponse.json(asset)
  } catch (error) {
    return NextResponse.json(
      { error: "创建资产记录失败" },
      { status: 500 }
    )
  }
}
