import { auth } from "@/lib/auth"
import { calculateAllProfits, getTotalProfitCNY, PeriodType } from "@/lib/services/profit"
import { ProfitTable } from "@/components/profits/profit-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>
}

const periodLabels: Record<string, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  year: "今年",
  all: "累计",
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const params = await searchParams
  const period = (params.period || "month") as PeriodType

  const profits = await calculateAllProfits(session.user.id, period)
  const totalProfitCNY = await getTotalProfitCNY(profits)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">收益报表</h1>
        <Select name="period" defaultValue={period}>
          <SelectTrigger className="w-32">
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
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {periodLabels[period]}总收益
            </CardTitle>
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
            <p className="text-xs text-gray-400 mt-1">已换算为 CNY</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              统计账户数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profits.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              盈利账户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {profits.filter((p) => p.realProfit > 0).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              亏损: {profits.filter((p) => p.realProfit < 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各账户收益明细</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfitTable profits={profits} />
        </CardContent>
      </Card>
    </div>
  )
}