"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function MarketRadarRefreshButton() {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [message, setMessage] = useState("")

  async function refresh() {
    setIsRefreshing(true)
    setMessage("")

    try {
      const response = await fetch("/api/market-radar/refresh", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        setMessage(data.error || "刷新失败")
        return
      }

      setMessage("已生成新的配置体检")
      router.refresh()
    } catch {
      setMessage("刷新请求失败，请稍后再试")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button onClick={refresh} disabled={isRefreshing}>
        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
        {isRefreshing ? "刷新中..." : "刷新配置体检"}
      </Button>
      {message && <p className="text-sm text-gray-500">{message}</p>}
    </div>
  )
}
