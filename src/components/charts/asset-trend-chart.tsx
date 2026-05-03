"use client"

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface TrendData {
  date: string
  total: number
}

interface AssetTrendChartProps {
  data: TrendData[]
}

export function AssetTrendChart({ data }: AssetTrendChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }

  // 计算涨跌
  const firstValue = data[0]?.total || 0
  const lastValue = data[data.length - 1]?.total || 0
  const change = lastValue - firstValue
  const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0

  return (
    <div>
      {/* 涨跌统计 */}
      <div className="flex gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-500">期初：</span>
          <span className="font-medium">{formatCurrency(firstValue)}</span>
        </div>
        <div>
          <span className="text-gray-500">期末：</span>
          <span className="font-medium">{formatCurrency(lastValue)}</span>
        </div>
        <div>
          <span className="text-gray-500">涨跌：</span>
          <span
            className={`font-medium ${
              change >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {formatCurrency(Math.abs(change))} ({changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 图表 */}
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value: number) => [formatCurrency(value), "总资产"]}
              labelFormatter={(label) => `日期: ${label}`}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
