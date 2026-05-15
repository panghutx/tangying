import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getGoal, updateGoal, archiveGoal } from "@/lib/services/goal"

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

    const goal = await getGoal(id)
    if (!goal || goal.userId !== session.user.id) {
      return NextResponse.json({ error: "目标不存在" }, { status: 404 })
    }

    return NextResponse.json(goal)
  } catch {
    return NextResponse.json({ error: "获取目标失败" }, { status: 500 })
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
    const goal = await updateGoal(id, body)

    return NextResponse.json(goal)
  } catch {
    return NextResponse.json({ error: "更新目标失败" }, { status: 500 })
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

    await archiveGoal(id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "删除目标失败" }, { status: 500 })
  }
}
