"use client"

import { useState, useMemo } from "react"
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
import { Search, X } from "lucide-react"

interface Asset {
  id: string
  date: string
  amount: number
  currency: string
  note: string | null
  account: {
    name: string
    platform: string
  }
}

interface AssetListProps {
  assets: Asset[]
}

export function AssetList({ assets }: AssetListProps) {
  const router = useRouter()
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchAccount, setSearchAccount] = useState("")
  const [searchStartDate, setSearchStartDate] = useState("")
  const [searchEndDate, setSearchEndDate] = useState("")

  // 获取所有账户列表
  const accounts = useMemo(() => {
    const accountSet = new Set(assets.map((a) => a.account.name))
    return Array.from(accountSet).sort()
  }, [assets])

  // 过滤资产记录
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      // 账户筛选
      if (searchAccount && asset.account.name !== searchAccount) return false
      // 日期筛选
      const assetDate = new Date(asset.date)
      if (searchStartDate && assetDate < new Date(searchStartDate)) return false
      if (searchEndDate && assetDate > new Date(searchEndDate + "T23:59:59")) return false
      return true
    })
  }, [assets, searchAccount, searchStartDate, searchEndDate])

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/assets/${deleteId}`, {
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

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
    }).format(amount)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("zh-CN")
  }

  const hasFilters = searchAccount || searchStartDate || searchEndDate

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
          共 {filteredAssets.length} 条记录
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>账户</TableHead>
              <TableHead>金额</TableHead>
              <TableHead>备注</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  {hasFilters ? "没有符合条件的记录" : "暂无资产记录"}
                </TableCell>
              </TableRow>
            ) : (
              filteredAssets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell>{formatDate(asset.date)}</TableCell>
                  <TableCell>
                    {asset.account.name} ({asset.account.platform})
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatAmount(asset.amount, asset.currency)}
                  </TableCell>
                  <TableCell>{asset.note || "-"}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/assets/${asset.id}`)}
                    >
                      编辑
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500"
                      onClick={() => setDeleteId(asset.id)}
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
