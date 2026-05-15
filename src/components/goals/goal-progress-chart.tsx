'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ProgressData {
  date: string
  amount: number
}

interface GoalProgressChartProps {
  data: ProgressData[]
  targetAmount: number
}

export function GoalProgressChart({ data, targetAmount }: GoalProgressChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        暂无进度数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), '进度']}
          labelFormatter={(label) => `日期: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}