import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  calculateAllProfits,
  getTotalProfitCNY,
  PeriodType,
} from "@/lib/services/profit"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "month") as PeriodType
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const profits = await calculateAllProfits(
      session.user.id,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    const totalProfitCNY = await getTotalProfitCNY(profits)

    return NextResponse.json({
      period,
      profits,
      totalProfitCNY,
    })
  } catch {
    return NextResponse.json(
      { error: "获取收益汇总失败" },
      { status: 500 }
    )
  }
}
