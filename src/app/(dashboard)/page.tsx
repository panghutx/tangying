import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetTrendChart } from "@/components/charts/asset-trend-chart"
import { AssetByCurrencyChart } from "@/components/charts/asset-by-currency-chart"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getExchangeRates, convertCurrency } from "@/lib/services/exchange-rate"
import { calculateAllProfits, getTotalProfitCNY } from "@/lib/services/profit"
import { getGoals } from "@/lib/services/goal"
import { calculateGoalProgress } from "@/lib/services/goal"
import { GoalCard } from "@/components/goals/goal-card"

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

  // 获取每个账户的最新资产记录
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


  // 获取所有涉及的币种
  const currencies = [...new Set(latestAssetsRaw.map((a: { currency: string }) => a.currency))] as string[]
  const exchangeRates = await getExchangeRates(currencies, "CNY")

  // 计算当前总资产（换算成人民币）
  const currentTotalCNY = latestAssetsRaw.reduce((sum: number, asset: { currency: string; amount: bigint }) => {
    const rate = exchangeRates[asset.currency] || 1
    return sum + Number(asset.amount) * rate
  }, 0)


  // 按币种统计资产
  const assetsByCurrency: Record<string, { amount: number; count: number }> = latestAssetsRaw.reduce((acc, asset: { currency: string; amount: bigint }) => {
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

  // 获取所有有记录的日期
  const dates = [...new Set(assets.map((a: { date: Date }) => a.date.toISOString().split("T")[0]))].sort() as string[]

  // 为每个日期计算总资产（使用每个账户在该日期或之前最近的记录）
  const accountLatestValues = new Map<string, { amount: number; currency: string }>()

  const trendData = dates.map((dateStr: string) => {
    // 更新每个账户在该日期的最新值
    const dayAssets = assets.filter((a: { date: Date }) => a.date.toISOString().split("T")[0] === dateStr)
    for (const asset of dayAssets) {
      accountLatestValues.set(asset.accountId, {
        amount: Number(asset.amount),
        currency: asset.currency,
      })
    }

    // 计算该日期的总资产
    let total = 0
    for (const [, value] of accountLatestValues) {
      const rate = exchangeRates[value.currency] || 1
      total += value.amount * rate
    }

    return { date: dateStr, total }
  })

  // 获取本月收益统计
  const monthProfits = await calculateAllProfits(userId, "month")
  const monthProfitCNY = await getTotalProfitCNY(monthProfits)

  // Get active goals for dashboard
  const goals = await getGoals(session.user.id, "ACTIVE")
  const goalsWithProgress = await Promise.all(
    goals.slice(0, 2).map(async (goal) => ({
      ...goal,
      currentAmount: await calculateGoalProgress(goal.id),
    }))
  )

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
        <h1 className="text-2xl font-bold">资产概览</h1>
        <Link href="/assets/batch">
          <Button>快速记账</Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-3">
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
              本月收益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                monthProfitCNY >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {monthProfitCNY >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(monthProfitCNY))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              <Link href="/reports" className="hover:underline">
                查看详情 →
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Goal Cards */}
      {goalsWithProgress.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {goalsWithProgress.map((goal) => (
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}

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
              <p>还没有添加账户</p>
              <Link
                href="/accounts/new"
                className="text-blue-500 hover:underline mt-2 inline-block"
              >
                点击添加第一个账户
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[600px]">
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
          <p className="text-sm text-gray-500 mt-1">管理我的账户</p>
        </Link>
      </div>
    </div>
  )
}
