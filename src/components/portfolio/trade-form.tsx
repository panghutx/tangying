"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account { id: string; name: string; platform: string }

export function TradeForm({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const [form, setForm] = useState({ accountId: accounts[0]?.id || "", type: "BUY", symbol: "", name: "", market: "US_STOCK", bucket: "NASDAQ_TECH", currency: "USD", tradedAt: new Date().toISOString().slice(0, 10), quantity: "", price: "", fee: "0" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const update = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }))

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try {
      const response = await fetch("/api/investment-trades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity: Number(form.quantity), price: Number(form.price), fee: Number(form.fee) }) })
      const data = await response.json()
      if (!response.ok) { setError(data.error || "保存失败"); return }
      setForm((current) => ({ ...current, symbol: "", name: "", quantity: "", price: "", fee: "0" })); router.refresh()
    } catch { setError("网络错误，请稍后重试") } finally { setSaving(false) }
  }

  return <Card>
    <CardHeader><CardTitle>记录买入 / 卖出</CardTitle></CardHeader>
    <CardContent><form onSubmit={submit} className="grid gap-4 md:grid-cols-3">
      <Select label="账户" value={form.accountId} onChange={(v) => update("accountId", v)} options={accounts.map((a) => [a.id, `${a.name} (${a.platform})`])} />
      <Select label="交易类型" value={form.type} onChange={(v) => update("type", v)} options={[["BUY", "买入"], ["SELL", "卖出"]]} />
      <Field label="交易日期" value={form.tradedAt} onChange={(v) => update("tradedAt", v)} type="date" />
      <Field label="代码" value={form.symbol} onChange={(v) => update("symbol", v)} placeholder="如 MSFT" />
      <Field label="名称" value={form.name} onChange={(v) => update("name", v)} placeholder="如 Microsoft" />
      <Field label="币种" value={form.currency} onChange={(v) => update("currency", v)} placeholder="USD / CNY" />
      <Field label="数量" value={form.quantity} onChange={(v) => update("quantity", v)} type="number" />
      <Field label="成交价" value={form.price} onChange={(v) => update("price", v)} type="number" />
      <Field label="手续费" value={form.fee} onChange={(v) => update("fee", v)} type="number" />
      {error && <p className="md:col-span-3 text-sm text-red-500">{error}</p>}
      <div className="md:col-span-3"><Button type="submit" disabled={saving || accounts.length === 0}>{saving ? "保存中..." : "保存交易"}</Button></div>
    </form></CardContent>
  </Card>
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} step={type === "number" ? "0.000001" : undefined} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></div>
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <div className="space-y-2"><Label>{label}</Label><select className="h-10 w-full rounded-md border px-3 text-sm" value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></div>
}
