"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface AssetByCurrencyProps {
  data: {
    currency: string
    amount: number
    amountCNY: number
    count: number
  }[]
  exchangeRates: Record<string, number>
}

const COLORS = ["#4b9665", "#b9cf59", "#e7ae49", "#df7666", "#8374bc", "#5a9db0"]

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
                backgroundColor: "#fbfcf8",
                border: "1px solid #dce7d7",
                borderRadius: "12px",
                boxShadow: "0 10px 24px rgba(41, 75, 59, 0.12)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="mt-4 space-y-2">
        {data.map((item, index) => (
          <div key={item.currency} className="flex items-center justify-between border-b border-[#edf1e9] pb-2 last:border-0 last:pb-0">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm font-medium text-[#45644f]">
                {currencyNames[item.currency] || item.currency}
              </span>
              <span className="text-xs text-gray-400">
                ({item.count}个账户)
              </span>
            </div>
            <div className="text-right">
                <span className="text-sm font-semibold text-[#45644f]">
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
      <div className="mt-4 flex items-center justify-between border-t border-[#dfe8da] pt-4">
        <span className="text-sm font-medium text-[#738579]">总计</span>
        <span className="font-semibold text-[#294b3b]">{formatCurrency(total)}</span>
      </div>
    </div>
  )
}
