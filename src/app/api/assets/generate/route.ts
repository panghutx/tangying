import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  generateAssetSnapshot,
  generateAssetSnapshotsForUser,
} from "@/lib/services/asset-snapshot"
import { z } from "zod"

const generateAssetSchema = z.object({
  accountId: z.string().optional(),
  date: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const data = generateAssetSchema.parse(body)
    const date = data.date ? new Date(data.date) : new Date()

    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "日期格式不正确" }, { status: 400 })
    }

    const results = data.accountId
      ? [
          await generateAssetSnapshot({
            userId: session.user.id,
            accountId: data.accountId,
            date,
          }),
        ]
      : await generateAssetSnapshotsForUser({
          userId: session.user.id,
          date,
        })

    return NextResponse.json({
      total: results.length,
      created: results.filter((result) => result.status === "created").length,
      updated: results.filter((result) => result.status === "updated").length,
      skipped: results.filter((result) => result.status === "skipped").length,
      failed: results.filter((result) => result.status === "failed").length,
      results,
    })
  } catch (error) {
    console.error("生成资产记录失败:", error)
    return NextResponse.json({ error: "生成资产记录失败" }, { status: 500 })
  }
}
