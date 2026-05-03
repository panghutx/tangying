import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AssetTrendChart } from "@/components/charts/asset-trend-chart"
import Link from "next/link"
import { Button } from "@/components/ui/button"

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

  // 获取最近30天的资产快照
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
      accountId: true,
      account: {
        select: { name: true },
      },
    },
  })

  // 按日期聚合总资产
  const assetsByDate = assets.reduce((acc, asset) => {
    const dateKey = asset.date.toISOString().split("T")[0]
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, total: 0 }
    }
    acc[dateKey].total += Number(asset.amount)
    return acc
  }, {} as Record<string, { date: string; total: number }>)

  const trendData = Object.values(assetsByDate).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // 计算涨跌
  const latestAssets = await prisma.asset.groupBy({
    by: ["accountId"],
    where: { userId },
    _max: { amount: true, date: true },
  })

  // 获取上一个有记录的日期的资产
  const previousAssets = await prisma.$queryRaw<{ accountId: string; amount: bigint }[]>`
    SELECT
      a."accountId",
      a.amount
    FROM assets a
    INNER JOIN (
      SELECT
        "accountId",
        MAX(date) as max_date
      FROM assets
      WHERE "userId" = ${userId}
      GROUP BY "accountId"
    ) latest ON a."accountId" = latest."accountId" AND a.date = latest.max_date

    UNION ALL

    SELECT
      a."accountId",
      a.amount
    FROM assets a
    INNER JOIN (
      SELECT
        "accountId",
        MAX(date) as prev_date
      FROM assets
      WHERE "userId" = ${userId}
        AND date < (
          SELECT MAX(date) FROM assets WHERE "userId" = ${userId}
        )
      GROUP BY "accountId"
    ) prev ON a."accountId" = prev."accountId" AND a.date = prev.prev_date
  `

  // 计算当前总资产
  const currentTotal = latestAssets.reduce(
    (sum, a) => sum + Number(a._max.amount || 0),
    0
  )

  // 获取上一个记录日期
  const allDates = await prisma.asset.findMany({
    where: { userId },
    select: { date: true },
    distinct: ["date"],
    orderBy: { date: "desc" },
    take: 2,
  })

  let previousTotal = 0
  if (allDates.length >= 2) {
    const previousDate = allDates[1].date
    const previousDayAssets = await prisma.asset.findMany({
      where: {
        userId,
        date: previousDate,
      },
      select: { amount: true },
    })
    previousTotal = previousDayAssets.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    )
  }

  // 计算涨跌
  const change = currentTotal - previousTotal
  const changePercent = previousTotal > 0 ? (change / previousTotal) * 100 : 0

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

  // 格式化日期
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("zh-CN", {
      month: "short",
      day: "numeric",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">理财概览</h1>
        <Link href="/assets/new">
          <Button>记录资产</Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              总资产
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentTotal)}</div>
            {accounts.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">暂无数据</p>
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

      {/* 趋势图表 */}
      <Card>
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
                    <th className="p-3 text-right text-sm font-medium text-gray-500">
                      资产记录
                    </th>
                    <th className="p-3 text-right text-sm font-medium text-gray-500">
                      收益记录
                    </th>
                    <th className="p-3 text-right text-sm font-medium text-gray-500">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr key={account.id} className="border-b last:border-0">
                      <td className="p-3 font-medium">{account.name}</td>
                      <td className="p-3 text-gray-600">{account.platform}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                          {
                            {
                              DOMESTIC: "国内平台",
                              BANK: "银行理财",
                              BROKERAGE: "券商",
                              OVERSEAS: "海外平台",
                            }[account.type]
                          }
                        </span>
                      </td>
                      <td className="p-3 text-right">{account._count.assets}</td>
                      <td className="p-3 text-right">{account._count.incomes}</td>
                      <td className="p-3 text-right">
                        <Link
                          href={`/accounts/${account.id}`}
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
