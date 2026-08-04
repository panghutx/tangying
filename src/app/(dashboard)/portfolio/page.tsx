import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { HoldingForm } from "@/components/portfolio/holding-form"
import { PortfolioDashboard } from "@/components/portfolio/portfolio-dashboard"
import { getPortfolioHoldings } from "@/lib/services/portfolio"
import { TradeForm } from "@/components/portfolio/trade-form"

export default async function PortfolioPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      platform: true,
      currency: true,
    },
  })

  const portfolio = await getPortfolioHoldings(session.user.id)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">投资持仓</h1>
        <p className="mt-1 text-sm text-gray-500">
          录入代码、数量和成本后，刷新行情即可自动计算市值、盈亏和资产桶占比。
        </p>
      </div>

      <PortfolioDashboard portfolio={JSON.parse(JSON.stringify(portfolio))} />
      <TradeForm accounts={accounts} />
      <HoldingForm accounts={accounts} />
    </div>
  )
}
