"use client"

import { ProfitResult } from "@/lib/services/profit"

interface ProfitTableProps {
  profits: ProfitResult[]
}

export function ProfitTable({ profits }: ProfitTableProps) {
  if (profits.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无收益数据，请先记录资产快照
      </div>
    )
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (rate: number) => {
    return `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%`
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              账户
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              期初资产
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              期末资产
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              净流入
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              真实收益
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              收益率
            </th>
          </tr>
        </thead>
        <tbody>
          {profits.map((profit) => (
            <tr key={profit.accountId} className="border-b last:border-0">
              <td className="p-3">
                <div className="font-medium">
                  {profit.accountName}
                  {!profit.hasValidData && (
                    <span className="ml-2 text-xs text-orange-500">(缺期初数据)</span>
                  )}
                </div>
                <div className="text-xs text-gray-500">{profit.currency}</div>
              </td>
              <td className="p-3 text-right">
                {profit.hasValidData ? (
                  formatCurrency(profit.startAsset, profit.currency)
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="p-3 text-right">
                {formatCurrency(profit.endAsset, profit.currency)}
              </td>
              <td className="p-3 text-right">
                <span
                  className={
                    profit.netInflow >= 0 ? "text-blue-600" : "text-orange-600"
                  }
                >
                  {profit.netInflow >= 0 ? "+" : ""}
                  {formatCurrency(profit.netInflow, profit.currency)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span
                  className={
                    profit.realProfit >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {profit.realProfit >= 0 ? "+" : ""}
                  {formatCurrency(profit.realProfit, profit.currency)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span
                  className={
                    profit.profitRate >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {formatPercent(profit.profitRate)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
