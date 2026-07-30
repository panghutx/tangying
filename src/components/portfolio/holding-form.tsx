"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account {
  id: string
  name: string
  platform: string
  currency: string
}

const markets = [
  ["US_STOCK", "美股"],
  ["US_ETF", "美股ETF"],
  ["CN_FUND", "国内场外基金"],
  ["CN_ETF", "国内场内ETF"],
  ["HK_STOCK", "港股"],
  ["CASH", "现金"],
  ["OTHER", "其他"],
]

const buckets = [
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

export function HoldingForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    accountId: accounts[0]?.id || "",
    symbol: "",
    name: "",
    market: "US_STOCK",
    bucket: "NASDAQ_TECH",
    currency: "USD",
    quantity: "",
    costAmount: "",
    costCurrency: "USD",
    note: "",
  })

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          quantity: Number(form.quantity),
          costAmount: Number(form.costAmount),
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        setError(data.error || "保存失败")
        return
      }

      setForm((current) => ({
        ...current,
        symbol: "",
        name: "",
        quantity: "",
        costAmount: "",
        note: "",
      }))
      router.refresh()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>新增/更新持仓</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>账户</Label>
            <select
              className="h-10 w-full rounded-md border px-3 text-sm"
              value={form.accountId}
              onChange={(event) => setForm({ ...form, accountId: event.target.value })}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.platform})
                </option>
              ))}
            </select>
          </div>
          <Field label="代码" value={form.symbol} onChange={(symbol) => setForm({ ...form, symbol })} placeholder="MSFT / 005698" />
          <Field label="名称" value={form.name} onChange={(name) => setForm({ ...form, name })} placeholder="Microsoft / 华夏全球科技先锋" />
          <div className="space-y-2">
            <Label>市场</Label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.market} onChange={(event) => setForm({ ...form, market: event.target.value })}>
              {markets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label>资产桶</Label>
            <select className="h-10 w-full rounded-md border px-3 text-sm" value={form.bucket} onChange={(event) => setForm({ ...form, bucket: event.target.value })}>
              {buckets.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <Field label="价格币种" value={form.currency} onChange={(currency) => setForm({ ...form, currency })} placeholder="USD / CNY" />
          <Field label="数量/份额" value={form.quantity} onChange={(quantity) => setForm({ ...form, quantity })} type="number" />
          <Field label="总成本" value={form.costAmount} onChange={(costAmount) => setForm({ ...form, costAmount })} type="number" />
          <Field label="成本币种" value={form.costCurrency} onChange={(costCurrency) => setForm({ ...form, costCurrency })} placeholder="USD / CNY" />
          <Field label="备注" value={form.note} onChange={(note) => setForm({ ...form, note })} placeholder="可选" />
          {error && <p className="md:col-span-2 text-sm text-red-500">{error}</p>}
          <div className="md:col-span-2">
            <Button type="submit" disabled={isLoading || accounts.length === 0}>
              {isLoading ? "保存中..." : "保存持仓"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type={type}
        step={type === "number" ? "0.000001" : undefined}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  )
}
