"use client"

import { useState, useEffect } from "react"
import { ProfitResult } from "@/lib/services/profit"
import { X, Search } from "lucide-react"

interface AssetHistoryProps {
  profit: ProfitResult
  onClose: () => void
}

interface AssetRecord {
  id: string
  date: Date
  amount: number
  note: string | null
}

export function AssetHistory({ profit, onClose }: AssetHistoryProps) {
  const [assets, setAssets] = useState<AssetRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [searchStartDate, setSearchStartDate] = useState("")
  const [searchEndDate, setSearchEndDate] = useState("")

  useEffect(() => {
    async function fetchAssets() {
      setLoading(true)
      const params = new URLSearchParams({
        accountId: profit.accountId,
      })
      const res = await fetch(`/api/assets?${params}`)
      const data = await res.json()
      // 按日期排序（最新的在前）
      const sorted = data.sort((a: AssetRecord, b: AssetRecord) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      setAssets(sorted)
      setLoading(false)
    }
    fetchAssets()
  }, [profit.accountId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: profit.currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(date))
  }

  // 根据搜索条件过滤资产记录
  const filteredAssets = assets.filter((asset) => {
    const assetDate = new Date(asset.date)
    if (searchStartDate && assetDate < new Date(searchStartDate)) return false
    if (searchEndDate && assetDate > new Date(searchEndDate + "T23:59:59")) return false
    return true
  })

  // 计算变化
  const getChange = (index: number) => {
    if (index === filteredAssets.length - 1) return null
    const current = filteredAssets[index].amount
    const prev = filteredAssets[index + 1].amount
    return current - prev
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{profit.accountName} - 资产记录</h3>
            <p className="text-sm text-gray-500">共 {filteredAssets.length} 条记录</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Search className="w-4 h-4" />
              <span>筛选:</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={searchStartDate}
                onChange={(e) => setSearchStartDate(e.target.value)}
                className="text-sm border rounded px-2 py-1"
                placeholder="开始日期"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={searchEndDate}
                onChange={(e) => setSearchEndDate(e.target.value)}
                className="text-sm border rounded px-2 py-1"
                placeholder="结束日期"
              />
            </div>
            {(searchStartDate || searchEndDate) && (
              <button
                onClick={() => { setSearchStartDate(""); setSearchEndDate("") }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                清除
              </button>
            )}
          </div>
        </div>

        <div className="overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无资产记录</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white border-b">
                <tr className="text-left text-sm text-gray-500">
                  <th className="p-3">日期</th>
                  <th className="p-3 text-right">资产</th>
                  <th className="p-3 text-right">变化</th>
                  <th className="p-3">备注</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssets.map((asset, index) => {
                  const change = getChange(index)
                  return (
                    <tr key={asset.id} className="border-b">
                      <td className="p-3 text-sm">
                        {formatDate(asset.date)}
                      </td>
                      <td className="p-3 text-right font-medium">
                        {formatCurrency(asset.amount)}
                      </td>
                      <td className={`p-3 text-right text-sm ${
                        change === null ? "text-gray-400" :
                        change > 0 ? "text-green-600" : "text-red-600"
                      }`}>
                        {change === null ? "-" :
                         change > 0 ? `+${formatCurrency(change)}` : formatCurrency(change)}
                      </td>
                      <td className="p-3 text-sm text-gray-500">
                        {asset.note || "-"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
