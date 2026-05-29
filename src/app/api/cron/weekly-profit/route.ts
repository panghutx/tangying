import { NextRequest, NextResponse } from "next/server"
import { saveWeeklyProfits } from "@/lib/services/weekly-profit"

export async function POST(request: NextRequest) {
  // Verify cron secret (for manual triggers)
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  // Allow Vercel Cron to pass without auth header (it's secured by Vercel)
  const isVercelCron = request.headers.get("x-vercel-cron") === "1"

  if (!isVercelCron && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Calculate and save last week's profits
    const result = await saveWeeklyProfits(1)

    return NextResponse.json({
      success: true,
      message: `Saved ${result.savedCount} weekly profit records for week starting ${result.weekStartDate.toISOString().split("T")[0]}`,
    })
  } catch (error) {
    console.error("Failed to save weekly profits:", error)
    return NextResponse.json(
      { error: "Failed to save weekly profits" },
      { status: 500 }
    )
  }
}
