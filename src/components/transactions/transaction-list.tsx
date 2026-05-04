"use client"

import { useState } from "react"
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

  if (transactions.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-gray-500">暂无流水记录</p>
        <div className="mt-4 flex justify-center gap-4">
          <Link
            href="/transactions/new"
            className="text-blue-500 hover:underline"
          >
            新增流水
          </Link>
          <Link
            href="/transactions/transfer"
            className="text-blue-500 hover:underline"
          >
            账户转账
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
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
            {transactions.map((transaction) => (
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
            ))}
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
