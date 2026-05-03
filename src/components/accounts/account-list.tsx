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

interface Account {
  id: string
  name: string
  type: "DOMESTIC" | "BANK" | "BROKERAGE" | "OVERSEAS"
  platform: string
  currency: string
  isActive: boolean
  _count?: {
    assets: number
    incomes: number
  }
}

const typeLabels: Record<string, string> = {
  DOMESTIC: "国内平台",
  BANK: "银行理财",
  BROKERAGE: "券商",
  OVERSEAS: "海外平台",
}

interface AccountListProps {
  accounts: Account[]
}

export function AccountList({ accounts }: AccountListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/accounts/${deleteId}`, {
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

  if (accounts.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center">
        <p className="text-gray-500">暂无账户，点击上方按钮添加</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>账户名称</TableHead>
              <TableHead>类型</TableHead>
              <TableHead>平台</TableHead>
              <TableHead>币种</TableHead>
              <TableHead>记录数</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="font-medium">{account.name}</TableCell>
                <TableCell>{typeLabels[account.type]}</TableCell>
                <TableCell>{account.platform}</TableCell>
                <TableCell>{account.currency}</TableCell>
                <TableCell>
                  资产 {account._count?.assets || 0} / 收益{" "}
                  {account._count?.incomes || 0}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push(`/accounts/${account.id}`)}
                  >
                    编辑
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500"
                    onClick={() => setDeleteId(account.id)}
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
            <DialogDescription>
              删除后将同时删除该账户下的所有资产和收益记录，此操作不可恢复。
            </DialogDescription>
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
