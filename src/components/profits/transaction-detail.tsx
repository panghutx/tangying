"use client"

import { useState, useEffect } from "react"
import { ProfitResult } from "@/lib/services/profit"
import { X } from "lucide-react"

interface TransactionDetailProps {
  profit: ProfitResult
  onClose: () => void
}

interface Transaction {
  id: string
  date: Date
  amount: number
  type: string
  category: string | null
  note: string | null
  account: { name: string }
  relatedAccount: { name: string } | null
}

export function TransactionDetail({ profit, onClose }: TransactionDetailProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true)
      const params = new URLSearchParams({
        accountId: profit.accountId,
      })
      const res = await fetch(`/api/transactions?${params}`)
      const data = await res.json()
      setTransactions(data)
      setLoading(false)
    }
    fetchTransactions()
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
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date))
  }

  const typeLabels: Record<string, string> = {
    DEPOSIT: "存入",
    WITHDRAW: "取出",
    TRANSFER_IN: "转入",
    TRANSFER_OUT: "转出",
    INCOME: "收入",
  }

  const typeColors: Record<string, string> = {
    DEPOSIT: "text-blue-600",
    WITHDRAW: "text-orange-600",
    TRANSFER_IN: "text-green-600",
    TRANSFER_OUT: "text-red-600",
    INCOME: "text-purple-600",
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="font-semibold">{profit.accountName} - 全部流水</h3>
            <p className="text-sm text-gray-500">
              共 {transactions.length} 笔记录
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b bg-gray-50">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-sm text-gray-500">存入</div>
              <div className="text-blue-600 font-medium">
                +{formatCurrency(profit.totalDeposit)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">取出</div>
              <div className="text-orange-600 font-medium">
                -{formatCurrency(profit.totalWithdraw)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">转入</div>
              <div className="text-green-600 font-medium">
                +{formatCurrency(profit.totalTransferIn)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">转出</div>
              <div className="text-red-600 font-medium">
                -{formatCurrency(profit.totalTransferOut)}
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[50vh]">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">暂无流水记录</div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b text-left text-sm text-gray-500">
                  <th className="p-3">时间</th>
                  <th className="p-3">类型</th>
                  <th className="p-3 text-right">金额</th>
                  <th className="p-3">备注</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id} className="border-b">
                    <td className="p-3 text-sm">
                      {formatDate(tx.date)}
                    </td>
                    <td className="p-3">
                      <span className={`font-medium ${typeColors[tx.type]}`}>
                        {typeLabels[tx.type] || tx.type}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-medium ${typeColors[tx.type]}`}>
                      {tx.type === "WITHDRAW" || tx.type === "TRANSFER_OUT" ? "-" : "+"}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="p-3 text-sm text-gray-500">
                      {tx.note || (tx.relatedAccount ? `来自/至: ${tx.relatedAccount.name}` : "-")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
