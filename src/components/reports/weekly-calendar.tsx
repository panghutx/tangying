"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarMonth, CalendarWeek } from "@/lib/services/weekly-profit"

interface WeeklyCalendarProps {
  initialData?: CalendarMonth[]
}

export function WeeklyCalendar({ initialData }: WeeklyCalendarProps) {
  const [data, setData] = useState<CalendarMonth[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)

  useEffect(() => {
    if (!initialData) {
      fetchCalendarData()
    }
  }, [])

  async function fetchCalendarData() {
    try {
      setLoading(true)
      const res = await fetch("/api/profits/calendar?months=6")
      const json = await res.json()
      setData(json.months || [])
    } catch (error) {
      console.error("Failed to fetch calendar data:", error)
    } finally {
      setLoading(false)
    }
  }

  function formatCurrency(amount: number, currency: string = "CNY"): string {
    const symbols: Record<string, string> = {
      CNY: "¥",
      USD: "$",
      HKD: "HK$",
      EUR: "€",
      GBP: "£",
      JPY: "¥",
    }
    const symbol = symbols[currency] || currency + " "
    const prefix = amount >= 0 ? "+" : "-"
    return `${prefix}${symbol}${Math.abs(amount).toFixed(2)}`
  }

  if (loading) {
    return <div className="text-center py-8 text-gray-500">加载中...</div>
  }

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          暂无收益数据
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      {data
        .filter((month) => month.weeks.some((w) => w.hasData))
        .map((month) => (
          <div key={month.month}>
            {/* Month header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{month.monthName}</h2>
              <div className="text-sm">
                <span className={month.monthTotalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                  {formatCurrency(month.monthTotalProfit)}
                </span>
              </div>
            </div>

            {/* Weeks grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {month.weeks.map((week) => (
                <WeekCard
                  key={week.weekStart}
                  week={week}
                  isExpanded={expandedWeek === week.weekStart}
                  onToggle={() => setExpandedWeek(expandedWeek === week.weekStart ? null : week.weekStart)}
                  formatCurrency={formatCurrency}
                />
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

function WeekCard({
  week,
  isExpanded,
  onToggle,
  formatCurrency,
}: {
  week: CalendarWeek
  isExpanded: boolean
  onToggle: () => void
  formatCurrency: (amount: number) => string
}) {
  const profitColor = week.totalProfit >= 0 ? "text-green-600" : "text-red-600"
  const bgColor = week.totalProfit >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
  const hoverBg = week.hasData ? "hover:shadow-md cursor-pointer" : "opacity-50"

  return (
    <Card
      className={`${bgColor} border ${hoverBg} transition-all`}
      onClick={week.hasData ? onToggle : undefined}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            {week.weekStart.split("-").slice(1).join("/")} ~ {week.weekEnd.split("-").slice(1).join("/")}
          </CardTitle>
          {week.hasData && (
            <span className={`text-lg font-bold ${profitColor}`}>
              {formatCurrency(week.totalProfit)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          {week.hasData ? (
            <>
              <span className="text-gray-500">收益率</span>
              <span className={profitColor}>
                {week.profitRate >= 0 ? "+" : ""}{week.profitRate.toFixed(2)}%
              </span>
            </>
          ) : (
            <span className="text-gray-400">暂无数据</span>
          )}
        </div>

        {/* Expanded view - account details */}
        {isExpanded && week.hasData && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-500 mb-2">账户明细</div>
            <div className="space-y-2">
              {week.profits.map((account) => (
                <div key={account.accountId} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{account.accountName}</span>
                  <span className={account.realProfit >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(account.realProfit, account.currency)}
                    <span className="text-gray-400 ml-1">
                      ({account.profitRate >= 0 ? "+" : ""}{account.profitRate.toFixed(2)}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
