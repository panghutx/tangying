import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { refreshMarketRadar } from "@/lib/services/market-radar"

export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const briefing = await refreshMarketRadar(session.user.id)

    return NextResponse.json({ briefing })
  } catch (error) {
    console.error("刷新市场雷达失败:", error)
    return NextResponse.json({ error: "刷新市场雷达失败" }, { status: 500 })
  }
}
