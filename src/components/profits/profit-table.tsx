"use client"

import { useState } from "react"
import { ProfitResult } from "@/lib/services/profit"
import { TransactionDetail } from "./transaction-detail"
import { AssetHistory } from "./asset-history"

interface ProfitTableProps {
  profits: ProfitResult[]
}

export function ProfitTable({ profits }: ProfitTableProps) {
  const [selectedProfit, setSelectedProfit] = useState<ProfitResult | null>(null)
  const [selectedProfitForAsset, setSelectedProfitForAsset] = useState<ProfitResult | null>(null)

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

  const formatDate = (date: Date | null) => {
    if (!date) return "-"
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
    }).format(date)
  }

  return (
    <>
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
                <td
                  className="p-3 text-right cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedProfitForAsset(profit)}
                >
                  {profit.hasValidData ? (
                    <div>
                      <div className="text-xs text-gray-400">{formatDate(profit.startAssetDate)}</div>
                      <div>{formatCurrency(profit.startAsset, profit.currency)}</div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td
                  className="p-3 text-right cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedProfitForAsset(profit)}
                >
                  <div>
                    <div className="text-xs text-gray-400">{formatDate(profit.endAssetDate)}</div>
                    <div>{formatCurrency(profit.endAsset, profit.currency)}</div>
                  </div>
                </td>
                <td
                  className="p-3 text-right cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedProfit(profit)}
                >
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

      {selectedProfit && (
        <TransactionDetail
          profit={selectedProfit}
          onClose={() => setSelectedProfit(null)}
        />
      )}

      {selectedProfitForAsset && (
        <AssetHistory
          profit={selectedProfitForAsset}
          onClose={() => setSelectedProfitForAsset(null)}
        />
      )}
    </>
  )
}
