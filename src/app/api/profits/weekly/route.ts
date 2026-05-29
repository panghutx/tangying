import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getRecentWeeklyProfits } from "@/lib/services/weekly-profit"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const weeks = parseInt(searchParams.get("weeks") || "8", 10)

  try {
    const weeklyProfits = await getRecentWeeklyProfits(session.user.id, Math.min(weeks, 52))

    return NextResponse.json({ weeklyProfits })
  } catch (error) {
    console.error("Failed to fetch weekly profits:", error)
    return NextResponse.json(
      { error: "Failed to fetch weekly profits" },
      { status: 500 }
    )
  }
}
