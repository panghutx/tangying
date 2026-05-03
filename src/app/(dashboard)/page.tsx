import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetTrendChart } from "@/components/charts/asset-trend-chart"
import { AssetByCurrencyChart } from "@/components/charts/asset-by-currency-chart"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getExchangeRates, convertCurrency } from "@/lib/services/exchange-rate"

export default async function HomePage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 获取账户列表
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { assets: true, incomes: true },
      },
    },
  })

  // 获取最新资产快照（按账户分组）
  const latestAssetsRaw = await prisma.$queryRaw<{
    accountId: string
    accountName: string
    platform: string
    currency: string
    amount: bigint
    date: Date
  }[]>`
    WITH latest AS (
      SELECT DISTINCT ON ("accountId")
        "accountId",
        amount,
        currency,
        date
      FROM assets
      WHERE "userId" = ${userId}
      ORDER BY "accountId", date DESC
    )
    SELECT
      l."accountId",
      l.amount,
      l.currency,
      l.date,
      a.name as "accountName",
      a.platform
    FROM latest l
    JOIN financial_accounts a ON l."accountId" = a.id
  `

  // 获取上一个有记录的日期的资产
  const allDates = await prisma.asset.findMany({
    where: { userId },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
    take: 2,
  })

  let previousAssets: { accountId: string; currency: string; amount: bigint }[] = []
  if (allDates.length >= 2) {
    previousAssets = await prisma.$queryRaw`
      SELECT "accountId", currency, amount
      FROM assets
      WHERE "userId" = ${userId}
        AND date = ${allDates[1].date}
    `
  }

  // 获取所有涉及的币种
  const currencies = [...new Set(latestAssetsRaw.map((a) => a.currency))]
  const exchangeRates = await getExchangeRates(currencies, "CNY")

  // 计算当前总资产（换算成人民币）
  const currentTotalCNY = latestAssetsRaw.reduce((sum, asset) => {
    const rate = exchangeRates[asset.currency] || 1
    return sum + Number(asset.amount) * rate
  }, 0)

  // 计算上一个日期的总资产
  const previousTotalCNY = previousAssets.reduce((sum, asset) => {
    const rate = exchangeRates[asset.currency] || 1
    return sum + Number(asset.amount) * rate
  }, 0)

  // 计算涨跌
  const change = currentTotalCNY - previousTotalCNY
  const changePercent = previousTotalCNY > 0 ? (change / previousTotalCNY) * 100 : 0

  // 按币种统计资产
  const assetsByCurrency = latestAssetsRaw.reduce((acc, asset) => {
    const currency = asset.currency
    if (!acc[currency]) {
      acc[currency] = { amount: 0, count: 0 }
    }
    acc[currency].amount += Number(asset.amount)
    acc[currency].count++
    return acc
  }, {} as Record<string, { amount: number; count: number }>)

  // 获取最近30天的资产快照用于趋势图
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const assets = await prisma.asset.findMany({
    where: {
      userId,
      date: { gte: thirtyDaysAgo },
    },
    orderBy: { date: "asc" },
    select: {
      date: true,
      amount: true,
      currency: true,
      accountId: true,
    },
  })

  // 按日期聚合总资产（换算成人民币）
  const assetsByDate = assets.reduce((acc, asset) => {
    const dateKey = asset.date.toISOString().split("T")[0]
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, total: 0 }
    }
    const rate = exchangeRates[asset.currency] || 1
    acc[dateKey].total += Number(asset.amount) * rate
    return acc
  }, {} as Record<string, { date: string; total: number }>)

  const trendData = Object.values(assetsByDate).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // 获取收益记录统计
  const totalIncome = await prisma.income.aggregate({
    where: { userId },
    _sum: { amount: true },
  })

  // 格式化货币
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">理财概览</h1>
        <Link href="/assets/batch">
          <Button>快速记账</Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              总资产 (CNY)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentTotalCNY)}</div>
            {Object.keys(assetsByCurrency).length > 1 && (
              <p className="text-xs text-gray-400 mt-1">
                已换算多币种资产
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              今日涨跌
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                change >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {change >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(change))}
            </div>
            <p
              className={`text-xs ${
                change >= 0 ? "text-green-500" : "text-red-500"
              }`}
            >
              {changePercent >= 0 ? "+" : ""}
              {changePercent.toFixed(2)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              账户数量
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accounts.length}</div>
            {accounts.length === 0 && (
              <Link
                href="/accounts/new"
                className="text-xs text-blue-500 hover:underline"
              >
                添加账户
              </Link>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              累计收益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                Number(totalIncome._sum.amount || 0) >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {formatCurrency(Number(totalIncome._sum.amount || 0))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* 趋势图表 */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>资产趋势（近30天）</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <AssetTrendChart data={trendData} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <p>暂无资产记录</p>
                <Link
                  href="/assets/new"
                  className="text-blue-500 hover:underline mt-2 inline-block"
                >
                  记录第一个资产快照
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 币种分布 */}
        {Object.keys(assetsByCurrency).length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>币种分布</CardTitle>
            </CardHeader>
            <CardContent>
              <AssetByCurrencyChart
                data={Object.entries(assetsByCurrency).map(([currency, data]) => ({
                  currency,
                  amount: data.amount,
                  amountCNY: data.amount * (exchangeRates[currency] || 1),
                  count: data.count,
                }))}
                exchangeRates={exchangeRates}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* 账户列表 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>我的账户</CardTitle>
          <Link href="/accounts/new">
            <Button variant="outline" size="sm">
              添加账户
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>还没有添加理财账户</p>
              <Link
                href="/accounts/new"
                className="text-blue-500 hover:underline mt-2 inline-block"
              >
                点击添加第一个账户
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="p-3 text-left text-sm font-medium text-gray-500">
                      名称
                    </th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">
                      平台
                    </th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">
                      类型
                    </th>
                    <th className="p-3 text-left text-sm font-medium text-gray-500">
                      最新资产
                    </th>
                    <th className="p-3 text-right text-sm font-medium text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {latestAssetsRaw.map((asset) => (
                    <tr key={asset.accountId} className="border-b last:border-0">
                      <td className="p-3 font-medium">{asset.accountName}</td>
                      <td className="p-3 text-gray-600">{asset.platform}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                          {asset.currency}
                        </span>
                      </td>
                      <td className="p-3">
                        {new Intl.NumberFormat("zh-CN", {
                          style: "currency",
                          currency: asset.currency,
                        }).format(Number(asset.amount))}
                        {asset.currency !== "CNY" && (
                          <span className="text-xs text-gray-400 ml-1">
                            (≈{formatCurrency(Number(asset.amount) * (exchangeRates[asset.currency] || 1))})
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/accounts/${asset.accountId}`}
                          className="text-blue-500 hover:underline text-sm"
                        >
                          详情
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 快捷操作 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link
          href="/assets"
          className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium">资产记录</h3>
          <p className="text-sm text-gray-500 mt-1">查看和管理资产快照</p>
        </Link>

        <Link
          href="/incomes"
          className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium">收益记录</h3>
          <p className="text-sm text-gray-500 mt-1">查看和管理收益明细</p>
        </Link>

        <Link
          href="/accounts"
          className="p-4 rounded-lg border hover:bg-gray-50 transition-colors"
        >
          <h3 className="font-medium">账户管理</h3>
          <p className="text-sm text-gray-500 mt-1">管理理财账户</p>
        </Link>
      </div>
    </div>
  )
}
