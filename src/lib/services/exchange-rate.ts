// 汇率服务 - 获取实时汇率并缓存

interface ExchangeRate {
  rate: number
  updatedAt: Date
}

// 汇率缓存（内存缓存，1小时过期）
const rateCache: Record<string, ExchangeRate> = {}

// 默认汇率（备用）
const defaultRates: Record<string, number> = {
  USD: 7.24, // 美元兑人民币
  HKD: 0.93, // 港币兑人民币
  EUR: 7.85, // 欧元兑人民币
  JPY: 0.048, // 日元兑人民币
  GBP: 9.15, // 英镑兑人民币
  CNY: 1, // 人民币
}

// 获取汇率（从 API 或缓存）
export async function getExchangeRate(fromCurrency: string, toCurrency = "CNY"): Promise<number> {
  if (fromCurrency === toCurrency) return 1

  const cacheKey = `${fromCurrency}_${toCurrency}`

  // 检查缓存（1小时内有效）
  const cached = rateCache[cacheKey]
  if (cached && Date.now() - cached.updatedAt.getTime() < 3600000) {
    return cached.rate
  }

  try {
    // 使用免费的汇率 API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`,
      { next: { revalidate: 3600 } } // Next.js 缓存1小时
    )

    if (!response.ok) {
      throw new Error("汇率 API 请求失败")
    }

    const data = await response.json()
    const rate = data.rates[toCurrency]

    if (!rate) {
      throw new Error(`不支持的币种: ${toCurrency}`)
    }

    // 更新缓存
    rateCache[cacheKey] = { rate, updatedAt: new Date() }

    return rate
  } catch (error) {
    console.warn("获取汇率失败，使用默认汇率:", error)

    // 使用默认汇率
    const fromRate = defaultRates[fromCurrency] || 1
    const toRate = defaultRates[toCurrency] || 1
    return toRate / fromRate
  }
}

// 批量获取汇率
export async function getExchangeRates(
  currencies: string[],
  toCurrency = "CNY"
): Promise<Record<string, number>> {
  const rates: Record<string, number> = {}

  // 并行获取所有汇率
  const promises = currencies.map(async (currency) => {
    rates[currency] = await getExchangeRate(currency, toCurrency)
  })

  await Promise.all(promises)
  return rates
}

// 金额转换
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency = "CNY"
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency)
  return amount * rate
}

// 格式化货币（带币种）
export function formatCurrencyWithCode(amount: number, currency: string): string {
  const symbols: Record<string, string> = {
    CNY: "¥",
    USD: "$",
    HKD: "HK$",
    EUR: "€",
    JPY: "¥",
    GBP: "£",
  }

  const symbol = symbols[currency] || currency
  const formatted = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount))

  return `${amount < 0 ? "-" : ""}${symbol}${formatted}`
}

// 获取支持的币种列表
export function getSupportedCurrencies(): { code: string; name: string; symbol: string }[] {
  return [
    { code: "CNY", name: "人民币", symbol: "¥" },
    { code: "USD", name: "美元", symbol: "$" },
    { code: "HKD", name: "港币", symbol: "HK$" },
    { code: "EUR", name: "欧元", symbol: "€" },
    { code: "JPY", name: "日元", symbol: "¥" },
    { code: "GBP", name: "英镑", symbol: "£" },
  ]
}
