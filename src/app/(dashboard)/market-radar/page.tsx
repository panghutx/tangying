import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getMarketRadarBriefings } from "@/lib/services/market-radar"
import { getPortfolioHoldings } from "@/lib/services/portfolio"
import { getCashFlowSummary } from "@/lib/services/cash-flow"
import { CashFlowDashboard } from "@/components/market-radar/cash-flow-dashboard"
import { MarketRadarDashboard } from "@/components/market-radar/market-radar-dashboard"
import { MarketRadarRefreshButton } from "@/components/market-radar/refresh-button"
import { WealthDashboard } from "@/components/market-radar/wealth-dashboard"

export default async function MarketRadarPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const [briefings, portfolio, cashFlow] = await Promise.all([
    getMarketRadarBriefings(session.user.id, 10),
    getPortfolioHoldings(session.user.id),
    getCashFlowSummary(session.user.id, 12),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">财富驾驶舱</h1>
          <p className="mt-1 text-sm text-gray-500">
            长期配置、下一笔新增资金和财富自由进度放在一起看，市场信息只作为辅助。
          </p>
        </div>
        <MarketRadarRefreshButton />
      </div>

      <WealthDashboard portfolio={JSON.parse(JSON.stringify(portfolio))} />
      <CashFlowDashboard cashFlow={cashFlow} />
      <MarketRadarDashboard briefings={JSON.parse(JSON.stringify(briefings))} />
    </div>
  )
}
