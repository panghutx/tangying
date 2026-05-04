"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

interface ProfitCardProps {
  totalProfitCNY: number
  period: string
  onPeriodChange: (period: string) => void
}

const periodLabels: Record<string, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  year: "今年",
  all: "累计",
}

export function ProfitCard({
  totalProfitCNY,
  period,
  onPeriodChange,
}: ProfitCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  const handlePeriodChange = (value: string | null) => {
    if (value) {
      setSelectedPeriod(value)
      onPeriodChange(value)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          收益统计
        </CardTitle>
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="year">今年</SelectItem>
            <SelectItem value="all">累计</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${
            totalProfitCNY >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {totalProfitCNY >= 0 ? "+" : ""}
          {formatCurrency(Math.abs(totalProfitCNY))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {periodLabels[selectedPeriod]}收益（CNY）
        </p>
      </CardContent>
    </Card>
  )
}
