import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getCalendarData } from "@/lib/services/weekly-profit"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const months = parseInt(searchParams.get("months") || "6", 10)

  try {
    const calendarData = await getCalendarData(session.user.id, Math.min(months, 12))

    return NextResponse.json({ months: calendarData })
  } catch (error) {
    console.error("Failed to fetch calendar data:", error)
    return NextResponse.json(
      { error: "Failed to fetch calendar data" },
      { status: 500 }
    )
  }
}
