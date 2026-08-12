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
    <div className="w-full">
      {/* 涨跌统计 */}
      <div className="mb-4 flex flex-wrap gap-x-7 gap-y-2 text-xs">
        <div>
          <span className="text-[#8a9b8b]">期初 </span>
          <span className="font-semibold text-[#45644f]">{formatCurrency(firstValue)}</span>
        </div>
        <div>
          <span className="text-[#8a9b8b]">期末 </span>
          <span className="font-semibold text-[#45644f]">{formatCurrency(lastValue)}</span>
        </div>
        <div>
          <span className="text-[#8a9b8b]">变化 </span>
          <span
            className={`font-semibold ${
              change >= 0 ? "text-[#3d8858]" : "text-[#c45f53]"
            }`}
          >
            {change >= 0 ? "+" : ""}
            {formatCurrency(Math.abs(change))} ({changePercent >= 0 ? "+" : ""}
            {changePercent.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 图表 */}
      <div className="h-[280px] w-full sm:h-[300px]">
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
            <CartesianGrid strokeDasharray="3 5" stroke="#e1e9dc" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#9aaa98"
              fontSize={12}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(value) => formatCurrency(value)}
              stroke="#9aaa98"
              fontSize={12}
              tickLine={false}
              width={80}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), "总资产"]}
              labelFormatter={(label) => `日期: ${label}`}
              contentStyle={{
                backgroundColor: "#fbfcf8",
                border: "1px solid #dce7d7",
                borderRadius: "12px",
                boxShadow: "0 10px 24px rgba(41, 75, 59, 0.12)",
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#3f8a60"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorTotal)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
