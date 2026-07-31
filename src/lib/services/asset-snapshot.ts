import { prisma } from "@/lib/prisma"
import { getExchangeRates } from "@/lib/services/exchange-rate"
import { refreshSecurityQuote } from "@/lib/services/quotes"
import { AssetSource, SecurityMarket } from "@prisma/client"
import type { Prisma } from "@prisma/client"

interface GenerateAssetSnapshotOptions {
  userId: string
  accountId: string
  date: Date
}

interface GenerateUserAssetSnapshotsOptions {
  userId: string
  date: Date
}

const nonRefreshableMarkets: SecurityMarket[] = ["CASH", "OTHER", "HK_STOCK"]

interface SnapshotItem {
  symbol: string
  name: string
  quantity: number
  price: number | null
  currency: string
  marketValue: number | null
  quotedAt?: string
  source?: string
}

type LatestQuote = {
  id: string
  createdAt: Date
  currency: string
  source: string
  securityId: string
  price: Prisma.Decimal
  quotedAt: Date
}

function toDateOnly(date: Date) {
  return new Date(date.toISOString().split("T")[0])
}

export async function generateAssetSnapshot({
  userId,
  accountId,
  date,
}: GenerateAssetSnapshotOptions) {
  const snapshotDate = toDateOnly(date)
  const account = await prisma.financialAccount.findFirst({
    where: { id: accountId, userId },
    include: {
      holdings: {
        include: {
          security: {
            include: {
              priceQuotes: {
                orderBy: { quotedAt: "desc" },
                take: 1,
              },
            },
          },
        },
      },
    },
  })

  if (!account) {
    throw new Error("账户不存在")
  }

  const existing = await prisma.asset.findUnique({
    where: {
      accountId_date: {
        accountId,
        date: snapshotDate,
      },
    },
  })

  if (existing?.source === "MANUAL") {
    return {
      status: "skipped" as const,
      reason: "已有手动资产记录",
      accountId,
      accountName: account.name,
      asset: existing,
    }
  }

  const quoteCurrencies = new Set<string>()
  const items: SnapshotItem[] = []

  for (const holding of account.holdings) {
    let quote: LatestQuote | undefined = holding.security.priceQuotes[0]

    if (!quote && !nonRefreshableMarkets.includes(holding.security.market)) {
      try {
        quote = await refreshSecurityQuote(holding.securityId)
      } catch {
        quote = undefined
      }
    }

    if (!quote) {
      items.push({
        symbol: holding.security.symbol,
        name: holding.security.name,
        quantity: Number(holding.quantity),
        price: null,
        currency: holding.security.currency,
        marketValue: null,
      })
      continue
    }

    quoteCurrencies.add(quote.currency)
    const quantity = Number(holding.quantity)
    const price = Number(quote.price)

    items.push({
      symbol: holding.security.symbol,
      name: holding.security.name,
      quantity,
      price,
      currency: quote.currency,
      marketValue: quantity * price,
      quotedAt: quote.quotedAt.toISOString(),
      source: quote.source,
    })
  }

  const cashBalance = account.cashBalance === null ? 0 : Number(account.cashBalance)
  const cashCurrency = account.cashCurrency || account.currency
  quoteCurrencies.add(cashCurrency)
  const rates = await getExchangeRates(Array.from(quoteCurrencies), account.currency)

  let holdingsValue = 0
  const valuedItems = items.map((item) => {
    const marketValue = item.marketValue
    const rate = rates[item.currency] || 1
    const valueInAccountCurrency = marketValue === null ? null : marketValue * rate
    holdingsValue += valueInAccountCurrency || 0

    return {
      ...item,
      valueInAccountCurrency,
      accountCurrency: account.currency,
    }
  })

  const cashValue = cashBalance * (rates[cashCurrency] || 1)
  const amount = holdingsValue + cashValue
  const source: AssetSource = cashBalance > 0 ? "AUTO_MIXED" : "AUTO_HOLDINGS"

  if (amount <= 0) {
    return {
      status: "skipped" as const,
      reason: "没有可估值持仓或现金余额",
      accountId,
      accountName: account.name,
      asset: null,
    }
  }

  const breakdown: Prisma.InputJsonObject = {
    generatedAt: new Date().toISOString(),
    holdingsValue,
    cashValue,
    cashBalance,
    cashCurrency,
    accountCurrency: account.currency,
    items: valuedItems,
  }

  const asset = await prisma.asset.upsert({
    where: {
      accountId_date: {
        accountId,
        date: snapshotDate,
      },
    },
    update: {
      amount,
      currency: account.currency,
      note: "自动生成：持仓市值 + 现金余额",
      source,
      breakdown,
    },
    create: {
      accountId,
      userId,
      date: snapshotDate,
      amount,
      currency: account.currency,
      note: "自动生成：持仓市值 + 现金余额",
      source,
      breakdown,
    },
  })

  return {
    status: existing ? ("updated" as const) : ("created" as const),
    accountId,
    accountName: account.name,
    asset,
  }
}

export async function generateAssetSnapshotsForUser({
  userId,
  date,
}: GenerateUserAssetSnapshotsOptions) {
  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  })

  const results = await Promise.allSettled(
    accounts.map((account) =>
      generateAssetSnapshot({ userId, accountId: account.id, date })
    )
  )

  return results.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value
    }

    return {
      status: "failed" as const,
      reason: result.reason instanceof Error ? result.reason.message : String(result.reason),
      accountId: accounts[index]?.id,
      accountName: null,
      asset: null,
    }
  })
}
