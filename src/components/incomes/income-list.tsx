"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
  PROFIT: "收益",
  DIVIDEND: "分红",
  INTEREST: "利息",
  FEE: "手续费",
}

interface IncomeListProps {
  incomes: any[]
}

export function IncomeList({ incomes }: IncomeListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/incomes/${deleteId}`, {
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

  const formatAmount = (amount: any) => {
    const num = Number(amount)
    const formatted = new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
    }).format(Math.abs(num))
    return num >= 0 ? `+${formatted}` : `-${formatted}`
  }

  const formatDate = (date: any) => {
    return new Date(date).toLocaleDateString("zh-CN")
  }

  if (incomes.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-gray-500">暂无收益记录，点击上方按钮添加</p>
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
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {incomes.map((income: any) => (
              <TableRow key={income.id}>
                <TableCell>{formatDate(income.date)}</TableCell>
                <TableCell>
                  {income.account.name} ({income.account.platform})
                </TableCell>
                <TableCell>{typeLabels[income.type]}</TableCell>
                <TableCell
                  className={`font-medium ${
                    Number(income.amount) >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {formatAmount(income.amount)}
                </TableCell>
                <TableCell>{income.note || "-"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/incomes/${income.id}`)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => setDeleteId(income.id)}
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
