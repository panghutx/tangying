import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateIncomeSchema } from "@/lib/validations/income"
import { IncomeType } from "@prisma/client"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const income = await prisma.income.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        account: true,
      },
    })

    if (!income) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    return NextResponse.json(income)
  } catch {
    return NextResponse.json(
      { error: "获取收益记录失败" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = updateIncomeSchema.parse(body)

    const income = await prisma.income.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: {
        accountId: data.accountId,
        date: data.date ? new Date(data.date) : undefined,
        amount: data.amount,
        type: data.type as IncomeType,
        note: data.note,
      },
    })

    return NextResponse.json(income)
  } catch {
    return NextResponse.json(
      { error: "更新收益记录失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    await prisma.income.delete({
      where: {
        id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "删除收益记录失败" },
      { status: 500 }
    )
  }
}
