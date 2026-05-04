import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateTransactionSchema } from "@/lib/validations/transaction"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        account: {
          select: { name: true, platform: true, currency: true },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch {
    return NextResponse.json(
      { error: "获取流水记录失败" },
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateTransactionSchema.parse(body)

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    const updateData: {
      date?: Date
      amount?: number
      type?: string
      category?: string | null
      note?: string | null
      relatedAccountId?: string | null
    } = {}

    if (data.date) updateData.date = new Date(data.date)
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.type) updateData.type = data.type
    if (data.category !== undefined) updateData.category = data.category || null
    if (data.note !== undefined) updateData.note = data.note || null
    if (data.relatedAccountId !== undefined) updateData.relatedAccountId = data.relatedAccountId || null

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData as any,
    })

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch {
    return NextResponse.json(
      { error: "更新流水记录失败" },
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

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    await prisma.transaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "删除流水记录失败" },
      { status: 500 }
    )
  }
}
