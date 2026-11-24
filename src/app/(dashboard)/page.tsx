import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { AssetTrendChart } from "@/components/charts/asset-trend-chart"
import { AssetByCurrencyChart } from "@/components/charts/asset-by-currency-chart"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getExchangeRates } from "@/lib/services/exchange-rate"
import { calculateAllProfits, getTotalProfitCNY } from "@/lib/services/profit"
import {
  ArrowRight,
  ArrowUpRight,
  CircleDollarSign,
  Landmark,
  Plus,
  Sparkles,
  WalletCards,
} from "lucide-react"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { assets: true } } },
  })

  const latestAssetsRaw = await prisma.$queryRaw<{
    accountId: string
    accountName: string
    platform: string
    currency: string
    amount: bigint
    date: Date
  }[]>`
    WITH latest AS (
      SELECT DISTINCT ON ("accountId") "accountId", amount, currency, date
      FROM assets
      WHERE "userId" = ${userId}
      ORDER BY "accountId", date DESC
    )
    SELECT l."accountId", l.amount, l.currency, l.date,
      a.name as "accountName", a.platform
    FROM latest l
    JOIN financial_accounts a ON l."accountId" = a.id
  `

  const currencies = [...new Set(latestAssetsRaw.map((asset) => asset.currency))]
  const exchangeRates = await getExchangeRates(currencies, "CNY")
  const currentTotalCNY = latestAssetsRaw.reduce((sum, asset) => {
    return sum + Number(asset.amount) * (exchangeRates[asset.currency] || 1)
  }, 0)

  const assetsByCurrency = latestAssetsRaw.reduce((acc, asset) => {
    if (!acc[asset.currency]) acc[asset.currency] = { amount: 0, count: 0 }
    acc[asset.currency].amount += Number(asset.amount)
    acc[asset.currency].count++
    return acc
  }, {} as Record<string, { amount: number; count: number }>)

  const assets = await prisma.asset.findMany({
    where: { userId },
    orderBy: { date: "asc" },
    select: { date: true, amount: true, currency: true, accountId: true },
  })
  const dates = [...new Set(assets.map((asset) => asset.date.toISOString().split("T")[0]))].sort()
  const accountLatestValues = new Map<string, { amount: number; currency: string }>()
  const trendData = dates.map((dateStr) => {
    assets
      .filter((asset) => asset.date.toISOString().split("T")[0] === dateStr)
      .forEach((asset) => accountLatestValues.set(asset.accountId, {
        amount: Number(asset.amount),
        currency: asset.currency,
      }))

    let total = 0
    for (const value of accountLatestValues.values()) {
      total += value.amount * (exchangeRates[value.currency] || 1)
    }
    return { date: dateStr, total }
  })

  const monthProfits = await calculateAllProfits(userId, "month")
  const monthProfitCNY = await getTotalProfitCNY(monthProfits)
  const formatCurrency = (amount: number) => new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    minimumFractionDigits: 2,
  }).format(amount)
  const displayName = session.user.name?.split(" ")[0] || "朋友"
  const currencyEntries = Object.entries(assetsByCurrency)

  return (
    <div className="dashboard-surface space-y-6">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#6e8b77]">
            <span className="h-2 w-2 rounded-full bg-[#c5db63]" />
            2026 年 8 月 · 财富概览
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#203d31] sm:text-[38px]">早上好，{displayName}</h1>
          <p className="mt-2 text-sm text-[#738579]">今天也让每一笔钱，都有清晰的去处。</p>
        </div>
        <Link href="/assets/batch">
          <Button className="h-11 rounded-xl bg-[#2f7454] px-5 text-sm font-semibold shadow-[0_10px_24px_rgba(47,116,84,0.2)] hover:bg-[#255f44]">
            <Plus className="h-4 w-4" />
            快速记账
          </Button>
        </Link>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.55fr_1fr_1fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl bg-[#234a38] p-5 text-[#f4f7e9] shadow-[0_18px_40px_rgba(35,74,56,0.16)] sm:p-6">
          <div className="dashboard-grid-line absolute inset-0 opacity-20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <p className="text-sm text-[#b2c9b1]">当前总资产</p>
              <CircleDollarSign className="h-5 w-5 text-[#d8eb86]" />
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-[34px]">{formatCurrency(currentTotalCNY)}</p>
            <div className="mt-5 flex items-center gap-2 text-xs text-[#bad0b7]">
              <span className="rounded-full bg-[#d8eb86] px-2 py-1 font-semibold text-[#264733]">CNY</span>
              <span>{currencyEntries.length > 1 ? "已自动换算多币种资产" : "人民币估值"}</span>
            </div>
          </div>
        </div>

        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#738579]">本月收益</p>
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${monthProfitCNY >= 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}><ArrowUpRight className="h-4 w-4" /></span>
          </div>
          <p className={`mt-5 text-2xl font-semibold tracking-[-0.03em] ${monthProfitCNY >= 0 ? "text-red-600" : "text-green-600"}`}>
            {monthProfitCNY >= 0 ? "+" : "-"}{formatCurrency(Math.abs(monthProfitCNY))}
          </p>
          <Link href="/reports" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#6e8b77] hover:text-[#2f7454]">查看收益详情 <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#738579]">活跃账户</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f8efd4] text-[#b27a21]"><Landmark className="h-4 w-4" /></span>
          </div>
          <p className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#294b3b]">{accounts.length}<span className="ml-1 text-sm font-normal text-[#8a9b8b]">个</span></p>
          <Link href="/accounts" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#6e8b77] hover:text-[#2f7454]">管理账户 <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>

        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-[#738579]">记录快照</p>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#e9e4f7] text-[#7460ad]"><WalletCards className="h-4 w-4" /></span>
          </div>
          <p className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-[#294b3b]">{assets.length}<span className="ml-1 text-sm font-normal text-[#8a9b8b]">笔</span></p>
          <Link href="/assets" className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-[#6e8b77] hover:text-[#2f7454]">查看资产记录 <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.8fr)]">
        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-[#294b3b]">资产趋势</h2>
                <span className="rounded-full bg-[#e8f3d8] px-2 py-1 text-[10px] font-semibold text-[#45805a]">LIVE</span>
              </div>
              <p className="mt-1 text-xs text-[#8a9b8b]">按快照记录追踪你的资产变化</p>
            </div>
            <Link href="/assets" className="hidden items-center gap-1 text-xs font-medium text-[#6e8b77] hover:text-[#2f7454] sm:flex">查看明细 <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          {trendData.length > 0 ? (
            <AssetTrendChart data={trendData} />
          ) : (
            <div className="dashboard-grid-line flex min-h-[300px] flex-col items-center justify-center rounded-xl border border-dashed border-[#ccd9c7] text-center">
              <Sparkles className="mb-3 h-6 w-6 text-[#b3c879]" />
              <p className="text-sm font-medium text-[#547260]">还没有资产趋势</p>
              <Link href="/assets/new" className="mt-2 text-xs font-medium text-[#2f7454] hover:underline">记录第一个资产快照</Link>
            </div>
          )}
        </div>

        <div className="soft-card rounded-2xl p-5 sm:p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold tracking-tight text-[#294b3b]">资产分布</h2>
            <p className="mt-1 text-xs text-[#8a9b8b]">按币种查看当前资产构成</p>
          </div>
          {currencyEntries.length > 0 ? (
            <AssetByCurrencyChart
              data={currencyEntries.map(([currency, data]) => ({
                currency,
                amount: data.amount,
                amountCNY: data.amount * (exchangeRates[currency] || 1),
                count: data.count,
              }))}
              exchangeRates={exchangeRates}
            />
          ) : (
            <div className="flex min-h-[260px] flex-col items-center justify-center rounded-xl bg-[#f3f6ee] text-center">
              <CircleDollarSign className="mb-3 h-6 w-6 text-[#aabe9d]" />
              <p className="text-sm font-medium text-[#547260]">暂无资产记录</p>
              <Link href="/assets/new" className="mt-2 text-xs font-medium text-[#2f7454] hover:underline">去记录资产</Link>
            </div>
          )}
        </div>
      </section>

      <section className="soft-card rounded-2xl p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-[#294b3b]">我的账户</h2>
            <p className="mt-1 text-xs text-[#8a9b8b]">最近一次快照 · 共 {accounts.length} 个活跃账户</p>
          </div>
          <Link href="/accounts/new"><Button variant="outline" size="sm" className="rounded-lg border-[#d3dfce] bg-transparent text-[#3f6a50] hover:bg-[#edf5e7]">添加账户</Button></Link>
        </div>
        {latestAssetsRaw.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#ccd9c7] py-10 text-center">
            <Landmark className="mb-3 h-6 w-6 text-[#aabe9d]" />
            <p className="text-sm font-medium text-[#547260]">还没有添加账户</p>
            <Link href="/accounts/new" className="mt-2 text-xs font-medium text-[#2f7454] hover:underline">添加第一个账户</Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {latestAssetsRaw.map((asset) => (
              <Link key={asset.accountId} href={`/accounts/${asset.accountId}`} className="group flex items-center justify-between rounded-xl border border-[#e1e8dd] bg-[#fbfcf8] p-4 transition hover:border-[#b9d09f] hover:bg-[#f5f9ef]">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f0dc] text-sm font-semibold text-[#467457]">{asset.accountName.slice(0, 1)}</div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#294b3b]">{asset.accountName}</p>
                    <p className="mt-1 truncate text-xs text-[#8a9b8b]">{asset.platform} · {asset.currency}</p>
                  </div>
                </div>
                <div className="ml-3 flex items-center gap-3 text-right">
                  <div>
                    <p className="text-sm font-semibold text-[#294b3b]">{new Intl.NumberFormat("zh-CN", { style: "currency", currency: asset.currency }).format(Number(asset.amount))}</p>
                    {asset.currency !== "CNY" && <p className="mt-1 text-[11px] text-[#8a9b8b]">≈ {formatCurrency(Number(asset.amount) * (exchangeRates[asset.currency] || 1))}</p>}
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-[#9cb29c] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#2f7454]" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/assets" className="group flex items-center justify-between rounded-2xl bg-[#e8f3d8] p-5 transition hover:bg-[#dfedce]">
          <div><p className="text-sm font-semibold text-[#315c42]">资产记录</p><p className="mt-1 text-xs text-[#66816b]">查看和管理每次资产快照</p></div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f7faef] text-[#4d865b] transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href="/accounts" className="group flex items-center justify-between rounded-2xl bg-[#f8efd4] p-5 transition hover:bg-[#f5e9c8]">
          <div><p className="text-sm font-semibold text-[#755526]">账户管理</p><p className="mt-1 text-xs text-[#9b7c4c]">统一管理你的现金与投资账户</p></div>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fffaf0] text-[#b38130] transition group-hover:translate-x-1"><ArrowRight className="h-4 w-4" /></span>
        </Link>
      </section>
    </div>
  )
}
