import { prisma } from "@/lib/prisma"
import { getExchangeRates } from "@/lib/services/exchange-rate"
import { AssetBucket } from "@prisma/client"

export const bucketLabels: Record<AssetBucket, string> = {
  CASH: "现金",
  SP500_GLOBAL: "标普500/全球宽基",
  NASDAQ_TECH: "纳指/美股科技",
  ACTIVE_TECH_AI: "主动科技/AI",
  CHINA_INTERNET: "中概互联网",
  CN_HK_EQUITY: "A股/港股",
  GOLD_RESOURCE: "黄金/资源",
  BOND_INCOME: "债券/固收",
  OTHER: "其他",
}

export const bucketTargets: Record<AssetBucket, { min: number; max: number }> = {
  CASH: { min: 20, max: 35 },
  SP500_GLOBAL: { min: 20, max: 30 },
  NASDAQ_TECH: { min: 15, max: 30 },
  ACTIVE_TECH_AI: { min: 0, max: 12 },
  CHINA_INTERNET: { min: 0, max: 8 },
  CN_HK_EQUITY: { min: 10, max: 25 },
  GOLD_RESOURCE: { min: 5, max: 10 },
  BOND_INCOME: { min: 0, max: 20 },
  OTHER: { min: 0, max: 5 },
}

export async function getPortfolioHoldings(userId: string) {
  const holdings = await prisma.holding.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: {
      account: { select: { id: true, name: true, platform: true, currency: true } },
      security: {
        include: {
          priceQuotes: {
            orderBy: { quotedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  })

  const currencies = [
    ...new Set(
      holdings.flatMap((holding) => [
        holding.costCurrency,
        holding.security.priceQuotes[0]?.currency || holding.security.currency,
      ])
    ),
  ]
  const rates = await getExchangeRates(currencies, "CNY")

  const rows = holdings.map((holding) => {
    const quote = holding.security.priceQuotes[0]
    const quantity = Number(holding.quantity)
    const costAmount = Number(holding.costAmount)
    const price = quote ? Number(quote.price) : null
    const priceCurrency = quote?.currency || holding.security.currency
    const marketValue = price === null ? null : quantity * price
    const marketValueCNY = marketValue === null ? null : marketValue * (rates[priceCurrency] || 1)
    const costCNY = costAmount * (rates[holding.costCurrency] || 1)
    const profitCNY = marketValueCNY === null ? null : marketValueCNY - costCNY
    const profitRate = profitCNY === null || costCNY === 0 ? null : (profitCNY / costCNY) * 100

    return {
      id: holding.id,
      account: holding.account,
      security: holding.security,
      quantity,
      costAmount,
      costCurrency: holding.costCurrency,
      latestPrice: price,
      latestPriceCurrency: priceCurrency,
      quotedAt: quote?.quotedAt || null,
      marketValue,
      marketValueCNY,
      costCNY,
      profitCNY,
      profitRate,
    }
  })

  const totalCNY = rows.reduce((sum, row) => sum + (row.marketValueCNY || 0), 0)
  const totalCostCNY = rows.reduce((sum, row) => sum + row.costCNY, 0)

  const buckets = Object.values(AssetBucket).map((bucket) => {
    const value = rows
      .filter((row) => row.security.bucket === bucket)
      .reduce((sum, row) => sum + (row.marketValueCNY || 0), 0)
    const share = totalCNY > 0 ? (value / totalCNY) * 100 : 0
    const target = bucketTargets[bucket]

    return {
      bucket,
      label: bucketLabels[bucket],
      value,
      share,
      min: target.min,
      max: target.max,
    }
  })

  return {
    rows,
    buckets,
    totalCNY,
    totalCostCNY,
    profitCNY: totalCNY - totalCostCNY,
  }
}
