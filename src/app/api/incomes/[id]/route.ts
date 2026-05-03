import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateIncomeSchema } from "@/lib/validations/income"

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
  } catch (error) {
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

    const updateData: any = {}
    if (data.accountId) updateData.accountId = data.accountId
    if (data.date) updateData.date = new Date(data.date)
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.type) updateData.type = data.type
    if (data.note !== undefined) updateData.note = data.note

    const income = await prisma.income.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: updateData,
    })

    return NextResponse.json(income)
  } catch (error) {
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
  } catch (error) {
    return NextResponse.json(
      { error: "删除收益记录失败" },
      { status: 500 }
    )
  }
}
