"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, X } from "lucide-react"

const typeLabels: Record<string, string> = {
  INCOME: "收益入账",
  DEPOSIT: "资金存入",
  WITHDRAW: "资金取出",
  TRANSFER_IN: "转账转入",
  TRANSFER_OUT: "转账转出",
}

const typeColors: Record<string, string> = {
  INCOME: "text-green-600",
  DEPOSIT: "text-blue-600",
  WITHDRAW: "text-orange-600",
  TRANSFER_IN: "text-blue-600",
  TRANSFER_OUT: "text-orange-600",
}

interface Transaction {
  id: string
  accountId: string
  date: string
  amount: number
  type: "INCOME" | "DEPOSIT" | "WITHDRAW" | "TRANSFER_IN" | "TRANSFER_OUT"
  category?: string | null
  note?: string | null
  account: {
    name: string
    platform: string
    currency: string
  }
}

interface TransactionListProps {
  transactions: Transaction[]
}

export function TransactionList({ transactions }: TransactionListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchAccount, setSearchAccount] = useState("")
  const [searchType, setSearchType] = useState("")
  const [searchStartDate, setSearchStartDate] = useState("")
  const [searchEndDate, setSearchEndDate] = useState("")

  // 获取所有账户列表
  const accounts = useMemo(() => {
    const accountSet = new Set(transactions.map((t) => t.account.name))
    return Array.from(accountSet).sort()
  }, [transactions])

  // 过滤流水记录
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (searchAccount && t.account.name !== searchAccount) return false
      if (searchType && t.type !== searchType) return false
      const txDate = new Date(t.date)
      if (searchStartDate && txDate < new Date(searchStartDate)) return false
      if (searchEndDate && txDate > new Date(searchEndDate + "T23:59:59")) return false
      return true
    })
  }, [transactions, searchAccount, searchType, searchStartDate, searchEndDate])

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/transactions/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const formatAmount = (amount: number, currency: string, type: Transaction["type"]) => {
    const formatted = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
    }).format(amount)
    const isNegative = type === "WITHDRAW" || type === "TRANSFER_OUT"
    return isNegative ? `-${formatted}` : `+${formatted}`
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("zh-CN")
  }

  const hasFilters = searchAccount || searchType || searchStartDate || searchEndDate

  return (
    <>
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">筛选:</span>
        </div>

        <select
          value={searchAccount}
          onChange={(e) => setSearchAccount(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">全部账户</option>
          {accounts.map((account) => (
            <option key={account} value={account}>
              {account}
            </option>
          ))}
        </select>

        <select
          value={searchType}
          onChange={(e) => setSearchType(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">全部类型</option>
          <option value="DEPOSIT">资金存入</option>
          <option value="WITHDRAW">资金取出</option>
          <option value="TRANSFER_IN">转账转入</option>
          <option value="TRANSFER_OUT">转账转出</option>
          <option value="INCOME">收益入账</option>
        </select>

        <div className="flex items-center gap-1">
          <input
            type="date"
            value={searchStartDate}
            onChange={(e) => setSearchStartDate(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          />
          <span className="text-gray-400">-</span>
          <input
            type="date"
            value={searchEndDate}
            onChange={(e) => setSearchEndDate(e.target.value)}
            className="text-sm border rounded px-2 py-1"
          />
        </div>

        {hasFilters && (
          <button
            onClick={() => {
              setSearchAccount("")
              setSearchType("")
              setSearchStartDate("")
              setSearchEndDate("")
            }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="w-3 h-3" />
            清除
          </button>
        )}

        <div className="ml-auto text-sm text-gray-500">
          共 {filteredTransactions.length} 条记录
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>账户</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>分类</TableHead>
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                  {hasFilters ? "没有符合条件的记录" : "暂无流水记录"}
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{transaction.account.name}</div>
                    <div className="text-xs text-gray-500">
                      {transaction.account.platform}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${typeColors[transaction.type]}`}>
                      {typeLabels[transaction.type]}
                    </span>
                  </TableCell>
                  <TableCell className={typeColors[transaction.type]}>
                    {formatAmount(
                      transaction.amount,
                      transaction.account.currency,
                      transaction.type
                    )}
                  </TableCell>
                  <TableCell>{transaction.category || "-"}</TableCell>
                  <TableCell>{transaction.note || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/transactions/${transaction.id}`)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => setDeleteId(transaction.id)}
                    >
                      删除
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>此操作不可恢复。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
