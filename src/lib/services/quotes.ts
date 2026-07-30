import { prisma } from "@/lib/prisma"
import { SecurityMarket } from "@prisma/client"

export interface QuoteResult {
  price: number
  currency: string
  quotedAt: Date
  source: string
}

async function fetchYahooQuote(symbol: string): Promise<QuoteResult> {
  const response = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`,
    {
      next: { revalidate: 900 },
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
      },
    }
  )

  if (!response.ok) {
    throw new Error("Yahoo 行情请求失败")
  }

  const data = await response.json()
  const result = data.chart?.result?.[0]
  const meta = result?.meta
  const price = meta?.regularMarketPrice ?? meta?.previousClose

  if (!price) {
    throw new Error(`未获取到 ${symbol} 的价格`)
  }

  return {
    price: Number(price),
    currency: meta.currency || "USD",
    quotedAt: meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date(),
    source: "yahoo",
  }
}

async function fetchNasdaqQuote(symbol: string, market: SecurityMarket): Promise<QuoteResult> {
  const assetClass = market === "US_ETF" ? "etf" : "stocks"
  const response = await fetch(
    `https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/info?assetclass=${assetClass}`,
    {
      next: { revalidate: 900 },
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        origin: "https://www.nasdaq.com",
        referer: "https://www.nasdaq.com/",
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Nasdaq 行情请求失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const rawPrice = data.data?.primaryData?.lastSalePrice
  const price = Number(String(rawPrice || "").replace(/[^\d.-]/g, ""))

  if (!price) {
    throw new Error(`Nasdaq 未获取到 ${symbol} 的价格`)
  }

  return {
    price,
    currency: "USD",
    quotedAt: new Date(),
    source: "nasdaq",
  }
}

async function fetchChinaFundQuote(symbol: string): Promise<QuoteResult> {
  const response = await fetch(
    `https://fundgz.1234567.com.cn/js/${encodeURIComponent(symbol)}.js?rt=${Date.now()}`,
    { next: { revalidate: 1800 } }
  )

  if (!response.ok) {
    throw new Error("基金净值请求失败")
  }

  const text = await response.text()
  const jsonText = text.match(/jsonpgz\((.*)\);?/)?.[1]

  if (!jsonText) {
    throw new Error(`未获取到 ${symbol} 的基金净值`)
  }

  const data = JSON.parse(jsonText)
  const price = Number(data.gsz || data.dwjz)

  if (!price) {
    throw new Error(`未获取到 ${symbol} 的有效净值`)
  }

  return {
    price,
    currency: "CNY",
    quotedAt: data.gztime ? new Date(data.gztime.replace(/-/g, "/")) : new Date(),
    source: "eastmoney-fundgz",
  }
}

async function fetchChinaFundNavQuote(symbol: string): Promise<QuoteResult> {
  const response = await fetch(
    `https://api.fund.eastmoney.com/f10/lsjz?fundCode=${encodeURIComponent(symbol)}&pageIndex=1&pageSize=1`,
    {
      next: { revalidate: 3600 },
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        referer: "https://fundf10.eastmoney.com/",
      },
    }
  )

  if (!response.ok) {
    throw new Error(`基金净值备用请求失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const latest = data.Data?.LSJZList?.[0]
  const price = Number(latest?.DWJZ)

  if (!price) {
    throw new Error(`未获取到 ${symbol} 的最新单位净值`)
  }

  return {
    price,
    currency: "CNY",
    quotedAt: latest.FSRQ ? new Date(String(latest.FSRQ).replace(/-/g, "/")) : new Date(),
    source: "eastmoney-nav",
  }
}

async function fetchChinaEtfQuote(symbol: string): Promise<QuoteResult> {
  const normalized = symbol.trim().toUpperCase()
  const code = normalized.replace(/\.(SH|SZ)$/, "")
  const marketPrefix = normalized.endsWith(".SH") || code.startsWith("5") ? "1" : "0"
  const response = await fetch(
    `https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=${marketPrefix}.${encodeURIComponent(code)}&fields=f12,f14,f2,f3,f4,f17`,
    {
      next: { revalidate: 60 },
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        referer: "https://quote.eastmoney.com/",
      },
    }
  )

  if (!response.ok) {
    throw new Error(`场内ETF行情请求失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const item = data.data?.diff?.[0]
  const price = Number(item?.f2)

  if (!price) {
    throw new Error(`未获取到 ${symbol} 的场内ETF价格`)
  }

  return {
    price,
    currency: "CNY",
    quotedAt: new Date(),
    source: "eastmoney-etf",
  }
}

export async function fetchQuote(symbol: string, market: SecurityMarket): Promise<QuoteResult> {
  if (market === "US_STOCK" || market === "US_ETF") {
    try {
      return await fetchYahooQuote(symbol)
    } catch {
      return fetchNasdaqQuote(symbol, market)
    }
  }

  if (market === "CN_FUND") {
    try {
      return await fetchChinaFundQuote(symbol)
    } catch {
      return fetchChinaFundNavQuote(symbol)
    }
  }

  if (market === "CN_ETF") {
    return fetchChinaEtfQuote(symbol)
  }

  throw new Error("这个市场暂未支持自动行情")
}

export async function refreshSecurityQuote(securityId: string) {
  const security = await prisma.security.findUnique({
    where: { id: securityId },
  })

  if (!security) {
    throw new Error("证券不存在")
  }

  const quote = await fetchQuote(security.symbol, security.market)

  return prisma.priceQuote.create({
    data: {
      securityId,
      price: quote.price,
      currency: quote.currency,
      quotedAt: quote.quotedAt,
      source: quote.source,
    },
  })
}
