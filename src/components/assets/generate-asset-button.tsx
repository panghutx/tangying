"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function GenerateAssetButton() {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleGenerate = async () => {
    setIsGenerating(true)
    setMessage(null)

    try {
      const response = await fetch("/api/assets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().split("T")[0] }),
      })
      const result = await response.json()

      if (!response.ok) {
        setMessage(result.error || "生成失败")
        return
      }

      setMessage(
        `已生成 ${result.created} 条，更新 ${result.updated} 条，跳过 ${result.skipped} 条`
      )
      router.refresh()
    } catch {
      setMessage("网络错误，请稍后重试")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {message && <span className="text-sm text-gray-500">{message}</span>}
      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "生成中..." : "生成今日记录"}
      </Button>
    </div>
  )
}
