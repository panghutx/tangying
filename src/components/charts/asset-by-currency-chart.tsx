"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"

interface AssetByCurrencyProps {
  data: {
    currency: string
    amount: number
    amountCNY: number
    count: number
  }[]
  exchangeRates: Record<string, number>
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"]

export function AssetByCurrencyChart({ data, exchangeRates }: AssetByCurrencyProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const currencyNames: Record<string, string> = {
    CNY: "人民币",
    USD: "美元",
    HKD: "港币",
    EUR: "欧元",
    JPY: "日元",
    GBP: "英镑",
  }

  const total = data.reduce((sum, item) => sum + item.amountCNY, 0)

  return (
    <div>
      {/* 图表 */}
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amountCNY"
              nameKey="currency"
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={80}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.currency}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => formatCurrency(Number(value))}
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.currency} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm">
                {currencyNames[item.currency] || item.currency}
              </span>
              <span className="text-xs text-gray-400">
                ({item.count}个账户)
              </span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium">
                {formatCurrency(item.amountCNY)}
              </span>
              {item.currency !== "CNY" && (
                <span className="text-xs text-gray-400 ml-1">
                  (汇率: {exchangeRates[item.currency]?.toFixed(4) || 1})
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 总计 */}
      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <span className="font-medium">总计</span>
        <span className="font-bold">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
