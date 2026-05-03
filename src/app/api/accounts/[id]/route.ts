import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateAccountSchema } from "@/lib/validations/account"

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

    const account = await prisma.financialAccount.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
    })

    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 })
    }

    return NextResponse.json(account)
  } catch (error) {
    return NextResponse.json(
      { error: "获取账户失败" },
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
    const data = updateAccountSchema.parse(body)

    const account = await prisma.financialAccount.update({
      where: {
        id,
        userId: session.user.id,
      },
      data,
    })

    return NextResponse.json(account)
  } catch (error) {
    return NextResponse.json(
      { error: "更新账户失败" },
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

    await prisma.financialAccount.delete({
      where: {
        id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "删除账户失败" },
      { status: 500 }
    )
  }
}
