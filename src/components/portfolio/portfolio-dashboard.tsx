"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PortfolioRow {
  id: string
  account: { id: string; name: string; platform: string }
  security: {
    symbol: string
    name: string
    bucket: string
    market: string
    currency: string
  }
  quantity: number
  costAmount: number
  costCurrency: string
  costCNY: number
  latestPrice: number | null
  latestPriceCurrency: string
  quotedAt: string | null
  marketValueCNY: number | null
  profitCNY: number | null
  profitRate: number | null
}

interface BucketRow {
  bucket: string
  label: string
  value: number
  share: number
  min: number
  max: number
}

interface PortfolioData {
  rows: PortfolioRow[]
  buckets: BucketRow[]
  totalCNY: number
  totalCostCNY: number
  holdingsValueCNY?: number
  cashValueCNY?: number
  profitCNY: number
  performance?: { xirr: number | null; twr: number | null; tradeCount: number; snapshotCount: number }
}

export function PortfolioDashboard({ portfolio }: { portfolio: PortfolioData }) {
  const router = useRouter()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [refreshMessage, setRefreshMessage] = useState("")
  const [refreshTone, setRefreshTone] = useState<"ok" | "warn" | "error">("ok")
  const [editing, setEditing] = useState<PortfolioRow | null>(null)
  const [pricing, setPricing] = useState<PortfolioRow | null>(null)
  const [editError, setEditError] = useState("")
  const [priceError, setPriceError] = useState("")
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isSavingPrice, setIsSavingPrice] = useState(false)
  const holdingsCostCNY = portfolio.rows.reduce((sum, row) => sum + row.costCNY, 0)
  const profitRate = holdingsCostCNY === 0 ? null : (portfolio.profitCNY / holdingsCostCNY) * 100

  async function refreshQuotes() {
    setIsRefreshing(true)
    setRefreshMessage("")
    try {
      const response = await fetch("/api/holdings/refresh", { method: "POST" })
      const data = await response.json()

      if (!response.ok) {
        setRefreshTone("error")
        setRefreshMessage(data.error || "刷新失败，请稍后重试")
        return
      }

      const failedDetails = Array.isArray(data.details)
        ? data.details.filter((item: { status: string }) => item.status === "failed")
        : []

      if (data.total === 0) {
        setRefreshTone("warn")
        setRefreshMessage("没有可刷新的持仓。")
      } else if (data.failed > 0) {
        setRefreshTone("warn")
        setRefreshMessage(
          `已刷新 ${data.success} 个，${data.failed} 个失败。${failedDetails
            .slice(0, 2)
            .map((item: { message?: string }) => item.message)
            .filter(Boolean)
            .join("；")}`
        )
      } else {
        setRefreshTone("ok")
        setRefreshMessage(`已刷新 ${data.success} 个标的${data.skipped ? `，跳过 ${data.skipped} 个手动标的` : ""}。`)
      }

      router.refresh()
    } catch {
      setRefreshTone("error")
      setRefreshMessage("刷新请求失败，请检查网络或稍后再试。")
    } finally {
      setIsRefreshing(false)
    }
  }

  async function deleteHolding(id: string) {
    await fetch(`/api/holdings/${id}`, { method: "DELETE" })
    router.refresh()
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return

    setIsSavingEdit(true)
    setEditError("")

    const formData = new FormData(event.currentTarget)
    const payload = {
      accountId: editing.account.id,
      symbol: String(formData.get("symbol") || ""),
      name: String(formData.get("name") || ""),
      market: String(formData.get("market") || ""),
      bucket: String(formData.get("bucket") || ""),
      currency: String(formData.get("currency") || ""),
      quantity: Number(formData.get("quantity") || 0),
      costAmount: Number(formData.get("costAmount") || 0),
      costCurrency: String(formData.get("costCurrency") || ""),
      note: "",
    }

    try {
      const response = await fetch(`/api/holdings/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        setEditError(data.error || "保存失败")
        return
      }

      setEditing(null)
      router.refresh()
    } catch {
      setEditError("网络错误，请稍后重试")
    } finally {
      setIsSavingEdit(false)
    }
  }

  async function saveManualPrice(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!pricing) return

    setIsSavingPrice(true)
    setPriceError("")

    const formData = new FormData(event.currentTarget)
    const payload = {
      marketValue: Number(formData.get("marketValue") || 0),
      unitPrice: Number(formData.get("unitPrice") || 0),
      currency: String(formData.get("currency") || pricing.latestPriceCurrency || pricing.security.currency),
    }

    try {
      const response = await fetch(`/api/holdings/${pricing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const data = await response.json()
        setPriceError(data.error || "保存失败")
        return
      }

      setPricing(null)
      router.refresh()
    } catch {
      setPriceError("网络错误，请稍后重试")
    } finally {
      setIsSavingPrice(false)
    }
  }

  function exportHoldings() {
    const headers = [
      "标的代码",
      "标的名称",
      "市场",
      "资产桶",
      "账户",
      "平台",
      "数量",
      "总成本",
      "成本币种",
      "最新价格",
      "价格币种",
      "报价日期",
      "市值(CNY)",
      "盈亏(CNY)",
      "盈亏率",
    ]
    const rows = portfolio.rows.map((row) => [
      row.security.symbol,
      row.security.name,
      row.security.market,
      row.security.bucket,
      row.account.name,
      row.account.platform,
      row.quantity,
      row.costAmount,
      row.costCurrency,
      row.latestPrice ?? "",
      row.latestPriceCurrency,
      row.quotedAt ? new Date(row.quotedAt).toLocaleDateString("zh-CN") : "",
      row.marketValueCNY ?? "",
      row.profitCNY ?? "",
      row.profitRate === null ? "" : `${row.profitRate.toFixed(2)}%`,
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => csvCell(value)).join(","))
      .join("\r\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `投资持仓-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric title="组合市值" value={formatCNY(portfolio.totalCNY)} />
          <Metric title="成本基准" value={formatCNY(portfolio.totalCostCNY)} />
          <Metric
            title="持仓盈亏"
            value={`${portfolio.profitCNY >= 0 ? "+" : ""}${formatCNY(portfolio.profitCNY)}`}
            tone={portfolio.profitCNY >= 0 ? "red" : "green"}
          />
          <Metric title="资金加权年化" value={portfolio.performance?.xirr === null || portfolio.performance?.xirr === undefined ? "数据不足" : formatPercent(portfolio.performance.xirr)} tooltip="XIRR：按每笔买入、卖出和费用的实际日期，计算个人资金的年化收益率。" />
          <Metric title="时间加权收益率" value={portfolio.performance?.twr === null || portfolio.performance?.twr === undefined ? "需要快照" : formatPercent(portfolio.performance.twr)} tooltip="TWR：根据资产快照分段计算，尽量排除资金进出时间影响。" />
          <Metric
            title="持仓收益率"
            value={profitRate === null ? "暂无" : formatPercent(profitRate)}
            tone={profitRate === null ? undefined : profitRate >= 0 ? "red" : "green"}
            tooltip="累计收益率 = 持仓盈亏 ÷ 投资持仓成本。仅统计投资持仓，不包含账户现金；不是年化收益率。"
          />
        </div>
        <Button onClick={refreshQuotes} disabled={isRefreshing || portfolio.rows.length === 0}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {portfolio.rows.length === 0 ? "先新增持仓" : isRefreshing ? "刷新中..." : "刷新行情"}
        </Button>
      </div>
      {typeof portfolio.cashValueCNY === "number" && portfolio.cashValueCNY > 0 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          已将账户可用现金 {formatCNY(portfolio.cashValueCNY)} 计入现金资产桶。
        </div>
      )}
      {refreshMessage && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            refreshTone === "ok"
              ? "border-green-200 bg-green-50 text-green-700"
              : refreshTone === "warn"
                ? "border-yellow-200 bg-yellow-50 text-yellow-800"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {refreshMessage}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>资产桶</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolio.buckets.filter((bucket) => bucket.value > 0 || bucket.min > 0).map((bucket) => (
            <div key={bucket.bucket}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{bucket.label}</span>
                <span className={bucket.share > bucket.max ? "font-semibold text-red-600" : "text-gray-600"}>
                  {formatPercent(bucket.share)} / {formatCNY(bucket.value)}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(bucket.share, 100)}%` }} />
              </div>
              <p className="mt-1 text-xs text-gray-400">目标 {bucket.min}%-{bucket.max}%</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>持仓明细</CardTitle>
          <Button variant="outline" size="sm" onClick={exportHoldings} disabled={portfolio.rows.length === 0}>
            <Download className="h-4 w-4" />
            导出
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>标的</TableHead>
                <TableHead>账户</TableHead>
                <TableHead className="text-right">数量</TableHead>
                <TableHead className="text-right">最新价格</TableHead>
                <TableHead className="text-right">市值(CNY)</TableHead>
                <TableHead className="text-right">盈亏</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    暂无持仓，先新增一笔。
                  </TableCell>
                </TableRow>
              ) : (
                portfolio.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <div className="font-medium">{row.security.symbol}</div>
                      <div className="text-xs text-gray-500">{row.security.name}</div>
                    </TableCell>
                    <TableCell>{row.account.name}</TableCell>
                    <TableCell className="text-right">{formatNumber(row.quantity)}</TableCell>
                    <TableCell className="text-right">
                      {row.latestPrice === null ? "-" : `${row.latestPriceCurrency} ${formatNumber(row.latestPrice)}`}
                      {row.quotedAt && <div className="text-xs text-gray-400">{new Date(row.quotedAt).toLocaleDateString("zh-CN")}</div>}
                    </TableCell>
                    <TableCell className="text-right">{row.marketValueCNY === null ? "待刷新" : formatCNY(row.marketValueCNY)}</TableCell>
                    <TableCell className={`text-right ${row.profitCNY === null ? "" : row.profitCNY >= 0 ? "text-red-600" : "text-green-600"}`}>
                      {row.profitCNY === null ? "-" : `${row.profitCNY >= 0 ? "+" : ""}${formatCNY(row.profitCNY)}`}
                      {row.profitRate !== null && <div className="text-xs">{formatPercent(row.profitRate)}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setPricing(row)}>
                        更新价格
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setEditing(row)}>
                        编辑
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-500" onClick={() => deleteHolding(row.id)}>
                        删除
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑持仓</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={saveEdit} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <EditField name="symbol" label="代码" defaultValue={editing.security.symbol} />
                <EditField name="name" label="名称" defaultValue={editing.security.name} />
                <SelectField name="market" label="市场" defaultValue={editing.security.market} options={marketOptions} />
                <SelectField name="bucket" label="资产桶" defaultValue={editing.security.bucket} options={bucketOptions} />
                <EditField name="currency" label="价格币种" defaultValue={editing.security.currency} />
                <EditField name="quantity" label="数量/份额" defaultValue={String(editing.quantity)} type="number" />
                <EditField name="costAmount" label="总成本" defaultValue={String(editing.costAmount)} type="number" />
                <EditField name="costCurrency" label="成本币种" defaultValue={editing.costCurrency} />
              </div>
              {editError && <p className="text-sm text-red-500">{editError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  取消
                </Button>
                <Button type="submit" disabled={isSavingEdit}>
                  {isSavingEdit ? "保存中..." : "保存"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pricing} onOpenChange={(open) => !open && setPricing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>更新价格</DialogTitle>
          </DialogHeader>
          {pricing && (
            <form onSubmit={saveManualPrice} className="space-y-4">
              <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <div className="font-medium text-gray-900">{pricing.security.symbol} {pricing.security.name}</div>
                <div className="mt-1">数量/份额：{formatNumber(pricing.quantity)}</div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <EditField name="marketValue" label="最新市值" defaultValue="" type="number" />
                <EditField name="unitPrice" label="单位价格" defaultValue="" type="number" />
                <EditField name="currency" label="币种" defaultValue={pricing.latestPriceCurrency || pricing.security.currency} />
              </div>
              <p className="text-xs text-gray-500">填“最新市值”或“单位价格”任意一个即可。填市值时会自动按数量反推单位价格。</p>
              {priceError && <p className="text-sm text-red-500">{priceError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPricing(null)}>
                  取消
                </Button>
                <Button type="submit" disabled={isSavingPrice}>
                  {isSavingPrice ? "保存中..." : "保存价格"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

const marketOptions = [
  ["US_STOCK", "美股"],
  ["US_ETF", "美股ETF"],
  ["CN_FUND", "国内场外基金"],
  ["CN_ETF", "国内场内ETF"],
  ["HK_STOCK", "港股"],
  ["CASH", "现金"],
  ["OTHER", "其他"],
]

const bucketOptions = [
  ["NASDAQ_TECH", "纳指/美股科技"],
  ["SP500_GLOBAL", "标普500/全球宽基"],
  ["ACTIVE_TECH_AI", "主动科技/AI"],
  ["CHINA_INTERNET", "中概互联网"],
  ["CN_HK_EQUITY", "A股/港股"],
  ["GOLD_RESOURCE", "黄金/资源"],
  ["BOND_INCOME", "债券/固收"],
  ["CASH", "现金"],
  ["OTHER", "其他"],
]

function EditField({
  name,
  label,
  defaultValue,
  type = "text",
}: {
  name: string
  label: string
  defaultValue: string
  type?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input name={name} type={type} step={type === "number" ? "0.000001" : undefined} defaultValue={defaultValue} />
    </div>
  )
}

function SelectField({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string
  label: string
  defaultValue: string
  options: string[][]
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select name={name} className="h-10 w-full rounded-md border px-3 text-sm" defaultValue={defaultValue}>
        {options.map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}

function Metric({ title, value, tone, tooltip }: { title: string; value: string; tone?: "red" | "green"; tooltip?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={`text-sm font-medium text-gray-500 ${tooltip ? "cursor-help" : ""}`} title={tooltip}>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${tone === "red" ? "text-red-600" : tone === "green" ? "text-green-600" : ""}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

function formatCNY(value: number) {
  return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 6 }).format(value)
}

function csvCell(value: string | number) {
  const text = String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}
