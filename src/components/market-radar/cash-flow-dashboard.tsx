"use client"

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import type { CashFlowSummary } from "@/lib/services/cash-flow"

export function CashFlowDashboard({ cashFlow }: { cashFlow: CashFlowSummary }) {
  const current = cashFlow.currentMonth

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="本月收入" value={formatCNY(current.incomeCNY)} />
        <Metric title="本月支出" value={formatCNY(current.expenseCNY)} />
        <Metric title="本月结余" value={formatCNY(current.netCashFlowCNY)} tone={current.netCashFlowCNY >= 0 ? "good" : "bad"} />
        <Metric title="本月储蓄率" value={`${current.savingsRate.toFixed(1)}%`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>现金流与不用上班进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-3">
            <Metric title="月均收入" value={formatCNY(cashFlow.averageMonthlyIncomeCNY)} />
            <Metric title="月均支出" value={formatCNY(cashFlow.averageMonthlyExpenseCNY)} />
            <Metric title="月均结余" value={formatCNY(cashFlow.averageMonthlyNetCNY)} tone={cashFlow.averageMonthlyNetCNY >= 0 ? "good" : "bad"} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(260px,360px)_1fr]">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">被动收入覆盖率</span>
                  <span className="font-medium text-gray-900">{cashFlow.averagePassiveCoverage.toFixed(1)}%</span>
                </div>
                <Progress value={cashFlow.averagePassiveCoverage} className="mt-2 h-3" />
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">距离不用上班还差</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {formatCNY(cashFlow.monthlyFreedomGapCNY)} / 月
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-500">
                  口径：被动收入使用“收益入账”，支出使用“资金取出”，转账不计入现金流。
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500">月均储蓄率</div>
                <div className="mt-2 text-2xl font-semibold text-gray-900">
                  {cashFlow.averageSavingsRate.toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="h-[300px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlow.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} stroke="#9ca3af" fontSize={12} tickLine={false} />
                  <YAxis tickFormatter={formatCompactCNY} stroke="#9ca3af" fontSize={12} tickLine={false} width={72} />
                  <Tooltip formatter={(value, name) => [formatCNY(Number(value)), cashFlowLabel(String(name))]} labelFormatter={(label) => `月份: ${label}`} />
                  <Bar dataKey="incomeCNY" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenseCNY" fill="#f97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="passiveIncomeCNY" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>储蓄率趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashFlow.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tickFormatter={formatMonthLabel} stroke="#9ca3af" fontSize={12} tickLine={false} />
                <YAxis tickFormatter={(value) => `${Number(value).toFixed(0)}%`} stroke="#9ca3af" fontSize={12} tickLine={false} width={56} />
                <Tooltip formatter={(value, name) => [`${Number(value).toFixed(1)}%`, cashFlowLabel(String(name))]} labelFormatter={(label) => `月份: ${label}`} />
                <Line type="monotone" dataKey="savingsRate" stroke="#2563eb" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="passiveCoverage" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ title, value, tone }: { title: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`mt-2 truncate text-xl font-semibold ${tone === "good" ? "text-green-600" : tone === "bad" ? "text-red-600" : "text-gray-900"}`}>
        {value}
      </div>
    </div>
  )
}

function cashFlowLabel(key: string) {
  const labels: Record<string, string> = {
    incomeCNY: "收入",
    expenseCNY: "支出",
    passiveIncomeCNY: "被动收入",
    savingsRate: "储蓄率",
    passiveCoverage: "被动收入覆盖率",
  }
  return labels[key] || key
}

function formatCNY(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCompactCNY(value: number) {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}万`
  return `${value.toFixed(0)}`
}

function formatMonthLabel(month: string) {
  const [, monthPart] = month.split("-")
  return `${Number(monthPart)}月`
}
