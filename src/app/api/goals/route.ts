import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { createGoal, getGoals } from "@/lib/services/goal"

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const goals = await getGoals(session.user.id)
    return NextResponse.json(goals)
  } catch {
    return NextResponse.json({ error: "获取目标列表失败" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const goal = await createGoal({
      userId: session.user.id,
      ...body,
    })

    return NextResponse.json(goal, { status: 201 })
  } catch {
    return NextResponse.json({ error: "创建目标失败" }, { status: 500 })
  }
}
