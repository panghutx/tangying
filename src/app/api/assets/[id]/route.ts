import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateAssetSchema } from "@/lib/validations/asset"

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

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        account: true,
      },
    })

    if (!asset) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    return NextResponse.json(asset)
  } catch (error) {
    return NextResponse.json(
      { error: "获取资产记录失败" },
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
    const data = updateAssetSchema.parse(body)

    const updateData: any = {}
    if (data.accountId) updateData.accountId = data.accountId
    if (data.date) updateData.date = new Date(data.date)
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.currency) updateData.currency = data.currency
    if (data.note !== undefined) updateData.note = data.note

    const asset = await prisma.asset.update({
      where: {
        id,
        userId: session.user.id,
      },
      data: updateData,
    })

    return NextResponse.json(asset)
  } catch (error) {
    return NextResponse.json(
      { error: "更新资产记录失败" },
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

    await prisma.asset.delete({
      where: {
        id,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: "删除资产记录失败" },
      { status: 500 }
    )
  }
}
