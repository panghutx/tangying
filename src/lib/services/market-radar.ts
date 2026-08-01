import { prisma } from "@/lib/prisma"
import { getPortfolioHoldings, bucketLabels } from "@/lib/services/portfolio"
import { Prisma } from "@prisma/client"

type MarketTemperature = "乐观" | "中性" | "谨慎" | "高风险"
type AllocationStatus = "健康" | "可优化" | "偏离" | "需复盘"

interface IndicatorSnapshot {
  symbol: string
  name: string
  category: string
  value: number
  changePct: number | null
  currency: string | null
  source: string
  observedAt: Date
}

interface NewsItem {
  title: string
  summary: string
  source: string
  url: string
  publishedAt: string
  sentiment?: string
  relevanceScore?: number
}

interface RadarSignal {
  title: string
  severity: "info" | "watch" | "risk"
  affectedBuckets: string[]
  summary: string
  suggestedAction: string
}

interface AiBriefingPayload {
  status: string
  marketTemperature: MarketTemperature
  summary: string
  keyChanges: string[]
  affectedBuckets: string[]
  reviewQuestions: string[]
  uncertainties: string[]
  signals: RadarSignal[]
}

interface AllocationSignal {
  title: string
  severity: "info" | "watch" | "risk"
  affectedBuckets: string[]
  summary: string
  suggestedAction: string
}

const bucketDisplayNames: Record<string, string> = {
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

const fredSeries = [
  { symbol: "SP500", name: "S&P 500", category: "美股宽基", currency: "USD" },
  { symbol: "NASDAQCOM", name: "Nasdaq Composite", category: "美股科技", currency: "USD" },
  { symbol: "DTWEXBGS", name: "美元指数", category: "汇率", currency: null },
  { symbol: "DEXCHUS", name: "USD/CNY", category: "汇率", currency: "CNY" },
  { symbol: "DGS10", name: "10年美债收益率", category: "利率" },
  { symbol: "VIXCLS", name: "VIX", category: "风险情绪" },
]

async function fetchEastmoneyIndex(): Promise<IndicatorSnapshot> {
  const response = await fetch(
    "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&secids=1.000300&fields=f12,f14,f2,f3,f4,f17",
    {
      next: { revalidate: 300 },
      headers: {
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        referer: "https://quote.eastmoney.com/",
      },
    }
  )

  if (!response.ok) {
    throw new Error(`沪深300 东方财富请求失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const item = data.data?.diff?.[0]
  const value = Number(item?.f2)
  const changePct = Number(item?.f3)

  if (!Number.isFinite(value)) {
    throw new Error("沪深300 未返回有效数值")
  }

  return {
    symbol: "000300",
    name: "沪深300",
    category: "A股",
    value,
    changePct: Number.isFinite(changePct) ? changePct : null,
    currency: "CNY",
    source: "eastmoney",
    observedAt: new Date(),
  }
}

async function fetchFredSeries(series: (typeof fredSeries)[number]): Promise<IndicatorSnapshot> {
  const apiKey = process.env.FRED_API_KEY
  if (!apiKey) {
    throw new Error("缺少 FRED_API_KEY")
  }

  const url = new URL("https://api.stlouisfed.org/fred/series/observations")
  url.searchParams.set("series_id", series.symbol)
  url.searchParams.set("api_key", apiKey)
  url.searchParams.set("file_type", "json")
  url.searchParams.set("sort_order", "desc")
  url.searchParams.set("limit", "2")

  const response = await fetch(url, { next: { revalidate: 3600 } })
  if (!response.ok) {
    throw new Error(`${series.name} FRED 请求失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  const observations = (data.observations || []).filter((item: { value: string }) => item.value !== ".")
  const latest = observations[0]
  const previous = observations[1]
  const value = Number(latest?.value)
  const previousValue = Number(previous?.value)

  if (!Number.isFinite(value)) {
    throw new Error(`${series.name} 未返回有效数值`)
  }

  return {
    symbol: series.symbol,
    name: series.name,
    category: series.category,
    value,
    changePct:
      Number.isFinite(previousValue) && previousValue > 0
        ? ((value - previousValue) / previousValue) * 100
        : null,
    currency: "currency" in series ? series.currency ?? null : null,
    source: "fred",
    observedAt: latest?.date ? new Date(`${latest.date}T00:00:00Z`) : new Date(),
  }
}

async function fetchMarketNews(): Promise<NewsItem[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY
  if (!apiKey) {
    throw new Error("缺少 ALPHA_VANTAGE_API_KEY")
  }

  const url = new URL("https://www.alphavantage.co/query")
  url.searchParams.set("function", "NEWS_SENTIMENT")
  url.searchParams.set("topics", "financial_markets,economy_macro,technology")
  url.searchParams.set("sort", "LATEST")
  url.searchParams.set("limit", "10")
  url.searchParams.set("apikey", apiKey)

  const response = await fetch(url, { next: { revalidate: 1800 } })
  if (!response.ok) {
    throw new Error(`Alpha Vantage 新闻请求失败: HTTP ${response.status}`)
  }

  const data = await response.json()
  if (data.Note || data.Information) {
    throw new Error(String(data.Note || data.Information))
  }

  return (data.feed || []).slice(0, 8).map(
    (item: {
      title?: string
      summary?: string
      source?: string
      url?: string
      time_published?: string
      overall_sentiment_label?: string
      relevance_score?: string
    }) => ({
      title: item.title || "",
      summary: item.summary || "",
      source: item.source || "Alpha Vantage",
      url: item.url || "",
      publishedAt: item.time_published || "",
      sentiment: item.overall_sentiment_label,
      relevanceScore: item.relevance_score ? Number(item.relevance_score) : undefined,
    })
  )
}

async function collectIndicatorSnapshots() {
  const results = await Promise.allSettled([
    ...fredSeries.map(fetchFredSeries),
    fetchEastmoneyIndex(),
  ])

  return {
    indicators: results
      .filter((result): result is PromiseFulfilledResult<IndicatorSnapshot> => result.status === "fulfilled")
      .map((result) => result.value),
    errors: results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result) => formatError(result.reason)),
  }
}

function formatError(error: unknown) {
  if (!(error instanceof Error)) {
    return String(error)
  }

  const cause = error.cause as { code?: string } | undefined
  if (cause?.code === "UND_ERR_CONNECT_TIMEOUT") {
    return `${error.message}: 连接超时`
  }

  return error.message
}

async function buildPortfolioContext(userId: string) {
  const portfolio = await getPortfolioHoldings(userId)
  const buckets = portfolio.buckets
    .filter((bucket) => bucket.value > 0 || bucket.share > 0)
    .map((bucket) => ({
      bucket: bucket.bucket,
      label: bucket.label,
      valueCNY: Math.round(bucket.value),
      share: Number(bucket.share.toFixed(2)),
      targetMin: bucket.min,
      targetMax: bucket.max,
      gapToMin: Number(Math.max(0, bucket.min - bucket.share).toFixed(2)),
      excessOverMax: Number(Math.max(0, bucket.share - bucket.max).toFixed(2)),
    }))
  const allocationSignals = buildAllocationSignals(buckets, portfolio.totalCNY)

  return {
    totalCNY: portfolio.totalCNY,
    profitCNY: portfolio.profitCNY,
    allocationStatus: getAllocationStatus(allocationSignals),
    contributionFocus: buildContributionFocus(buckets),
    buckets,
    allocationSignals,
    holdings: portfolio.rows.slice(0, 30).map((row) => ({
      symbol: row.security.symbol,
      name: row.security.name,
      bucketLabel: bucketLabels[row.security.bucket],
      marketValueCNY: row.marketValueCNY ? Math.round(row.marketValueCNY) : null,
      profitRate: row.profitRate === null ? null : Number(row.profitRate.toFixed(2)),
      quotedAt: row.quotedAt,
    })),
  }
}

function buildAllocationSignals(
  buckets: Array<{
    bucket: string
    label: string
    valueCNY: number
    share: number
    targetMin: number
    targetMax: number
    gapToMin: number
    excessOverMax: number
  }>,
  totalCNY: number
): AllocationSignal[] {
  const signals: AllocationSignal[] = []
  const byBucket = new Map(buckets.map((bucket) => [bucket.bucket, bucket]))
  const cash = byBucket.get("CASH")
  const techShare =
    (byBucket.get("NASDAQ_TECH")?.share || 0) + (byBucket.get("ACTIVE_TECH_AI")?.share || 0)
  const equityShare = [
    "SP500_GLOBAL",
    "NASDAQ_TECH",
    "ACTIVE_TECH_AI",
    "CHINA_INTERNET",
    "CN_HK_EQUITY",
  ].reduce((sum, bucket) => sum + (byBucket.get(bucket)?.share || 0), 0)

  if (cash && cash.excessOverMax > 0) {
    signals.push({
      title: "现金比例偏高",
      severity: cash.excessOverMax >= 10 ? "watch" : "info",
      affectedBuckets: ["现金"],
      summary: `现金占比 ${cash.share.toFixed(2)}%，高于目标上限 ${cash.targetMax}%。长期看，过多现金可能拖累组合收益。`,
      suggestedAction: "优先规划新增资金和闲置现金的配置去向，而不是继续增加现金。",
    })
  }

  if (cash && cash.gapToMin > 0) {
    signals.push({
      title: "现金安全垫不足",
      severity: "risk",
      affectedBuckets: ["现金"],
      summary: `现金占比 ${cash.share.toFixed(2)}%，低于目标下限 ${cash.targetMin}%。下跌时可能降低执行策略的稳定性。`,
      suggestedAction: "先检查生活费安全垫和未来支出，再决定是否继续投入风险资产。",
    })
  }

  if (techShare > 40) {
    signals.push({
      title: "科技暴露偏集中",
      severity: "watch",
      affectedBuckets: ["纳指/美股科技", "主动科技/AI"],
      summary: `纳指/科技与主动科技/AI 合计约 ${techShare.toFixed(2)}%，组合增长更依赖同一类风险因子。`,
      suggestedAction: "新增资金优先检查是否补低配资产桶，而不是继续强化科技因子。",
    })
  }

  if (equityShare > 75) {
    signals.push({
      title: "权益资产占比较高",
      severity: "watch",
      affectedBuckets: ["标普500/全球宽基", "纳指/美股科技", "主动科技/AI", "中概互联网", "A股/港股"],
      summary: `权益相关资产合计约 ${equityShare.toFixed(2)}%，组合长期收益弹性较高，但回撤也会更明显。`,
      suggestedAction: "复盘最大可接受回撤，并确认防守资产比例是否足够。",
    })
  }

  const underweight = buckets
    .filter((bucket) => bucket.gapToMin > 0 && bucket.bucket !== "CASH")
    .sort((a, b) => b.gapToMin - a.gapToMin)

  for (const bucket of underweight.slice(0, 3)) {
    const gapAmount = Math.round(totalCNY * (bucket.gapToMin / 100))
    signals.push({
      title: `${bucket.label} 低于目标区间`,
      severity: bucket.gapToMin >= 5 ? "watch" : "info",
      affectedBuckets: [bucket.label],
      summary: `${bucket.label} 当前占比 ${bucket.share.toFixed(2)}%，低于目标下限 ${bucket.targetMin}%，距离下限约 ${bucket.gapToMin.toFixed(2)} 个百分点，约 ${formatCNY(gapAmount)}。`,
      suggestedAction: "作为下一笔新增资金的候选方向，先补足低配资产桶。",
    })
  }

  const overweight = buckets
    .filter((bucket) => bucket.excessOverMax > 0 && bucket.bucket !== "CASH")
    .sort((a, b) => b.excessOverMax - a.excessOverMax)

  for (const bucket of overweight.slice(0, 3)) {
    signals.push({
      title: `${bucket.label} 高于目标区间`,
      severity: bucket.excessOverMax >= 5 ? "watch" : "info",
      affectedBuckets: [bucket.label],
      summary: `${bucket.label} 当前占比 ${bucket.share.toFixed(2)}%，高于目标上限 ${bucket.targetMax}%。`,
      suggestedAction: "后续新增资金暂缓继续流向该资产桶，优先补低配方向。",
    })
  }

  return signals
}

function getAllocationStatus(signals: AllocationSignal[]): AllocationStatus {
  if (signals.some((signal) => signal.severity === "risk")) return "需复盘"
  if (signals.filter((signal) => signal.severity === "watch").length >= 2) return "偏离"
  if (signals.length > 0) return "可优化"
  return "健康"
}

function buildContributionFocus(
  buckets: Array<{
    label: string
    share: number
    gapToMin: number
    excessOverMax: number
  }>
) {
  const underweight = buckets
    .filter((bucket) => bucket.gapToMin > 0)
    .sort((a, b) => b.gapToMin - a.gapToMin)
    .map((bucket) => bucket.label)
  const overweight = buckets
    .filter((bucket) => bucket.excessOverMax > 0)
    .sort((a, b) => b.excessOverMax - a.excessOverMax)
    .map((bucket) => bucket.label)

  return {
    nextMoneyCandidates: underweight.slice(0, 3),
    pauseCandidates: overweight.slice(0, 3),
  }
}

function fallbackBriefing(input: {
  portfolio: Awaited<ReturnType<typeof buildPortfolioContext>>
  indicators: IndicatorSnapshot[]
  news: NewsItem[]
  sourceErrors: string[]
}): AiBriefingPayload {
  const riskSignals: RadarSignal[] = input.portfolio.allocationSignals

  return {
    status: input.sourceErrors.length > 0 ? "partial" : "ok",
    marketTemperature: input.portfolio.allocationStatus === "健康" ? "中性" : "谨慎",
    summary: `长期配置状态：${input.portfolio.allocationStatus}。本页优先看资产配置和新增资金去向，市场新闻只作为背景。`,
    keyChanges: [
      `组合总资产约 ${formatCNY(input.portfolio.totalCNY)}`,
      `当前配置状态：${input.portfolio.allocationStatus}`,
      input.portfolio.contributionFocus.nextMoneyCandidates.length > 0
        ? `新增资金候选：${input.portfolio.contributionFocus.nextMoneyCandidates.join("、")}`
        : "暂无明显低配资产桶",
      input.portfolio.contributionFocus.pauseCandidates.length > 0
        ? `暂缓继续加重：${input.portfolio.contributionFocus.pauseCandidates.join("、")}`
        : "暂无明显超配资产桶",
    ],
    affectedBuckets: [...new Set(riskSignals.flatMap((signal) => signal.affectedBuckets))],
    reviewQuestions: [
      "下一笔新增资金是否应该优先补低配资产桶？",
      "当前现金比例是在等待机会，还是已经拖累长期收益？",
      "如果组合回撤 20%，现在的配置是否还能坚持？",
    ],
    uncertainties: input.sourceErrors.length > 0 ? input.sourceErrors : ["未接入更多中文本地新闻源，外部信息可能不完整。"],
    signals: riskSignals,
  }
}

function formatCNY(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(amount)
}

async function generateAiBriefing(input: {
  portfolio: Awaited<ReturnType<typeof buildPortfolioContext>>
  indicators: IndicatorSnapshot[]
  news: NewsItem[]
  sourceErrors: string[]
}): Promise<AiBriefingPayload & { model?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").replace(/\/$/, "")
  const model = process.env.OPENAI_MARKET_RADAR_MODEL || (baseUrl.includes("deepseek.com") ? "deepseek-v4-flash" : "gpt-5-mini")

  if (!apiKey) {
    return { ...fallbackBriefing(input), model: null as unknown as string }
  }

  if (baseUrl.includes("deepseek.com")) {
    return generateChatCompletionsBriefing({ input, apiKey, baseUrl, model })
  }

  const response = await fetch(`${baseUrl}/v1/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content:
            "你是长期资产配置教练。你的重点是资产配置、现金拖累、新增资金去向、再平衡纪律和财富自由路径。市场新闻和日涨跌通常是噪音，只能作为背景。你不提供具体标的买卖建议，不预测短期涨跌。输出必须是中文。",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "基于个人组合暴露和少量市场背景，生成一份长期配置体检简报。",
            portfolio: input.portfolio,
            indicators: input.indicators,
            news: input.news.slice(0, 5),
            sourceErrors: input.sourceErrors,
            outputRules: [
              "不要给买入、卖出、加仓、减仓某个标的的指令",
              "建议动作只能是规划新增资金、补低配资产桶、暂缓加重超配资产桶、检查现金安全垫、复盘最大回撤承受力、等待更多信息",
              "优先解释长期配置偏离，不要复述新闻标题",
              "如果新闻不影响长期配置假设，就明确视为噪音",
              `affectedBuckets 必须使用这些中文名称: ${Object.values(bucketDisplayNames).join("、")}`,
            ],
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "market_radar_briefing",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: [
              "status",
              "marketTemperature",
              "summary",
              "keyChanges",
              "affectedBuckets",
              "reviewQuestions",
              "uncertainties",
              "signals",
            ],
            properties: {
              status: { type: "string", enum: ["ok", "partial"] },
              marketTemperature: { type: "string", enum: ["乐观", "中性", "谨慎", "高风险"] },
              summary: { type: "string" },
              keyChanges: { type: "array", items: { type: "string" } },
              affectedBuckets: { type: "array", items: { type: "string" } },
              reviewQuestions: { type: "array", items: { type: "string" } },
              uncertainties: { type: "array", items: { type: "string" } },
              signals: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["title", "severity", "affectedBuckets", "summary", "suggestedAction"],
                  properties: {
                    title: { type: "string" },
                    severity: { type: "string", enum: ["info", "watch", "risk"] },
                    affectedBuckets: { type: "array", items: { type: "string" } },
                    summary: { type: "string" },
                    suggestedAction: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI 简报生成失败: HTTP ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const text = data.output_text || data.output?.flatMap((item: { content?: { text?: string }[] }) => item.content || []).map((content: { text?: string }) => content.text).filter(Boolean).join("")

  if (!text) {
    throw new Error("OpenAI 未返回简报文本")
  }

  return { ...JSON.parse(text), model }
}

async function generateChatCompletionsBriefing({
  input,
  apiKey,
  baseUrl,
  model,
}: {
  input: {
    portfolio: Awaited<ReturnType<typeof buildPortfolioContext>>
    indicators: IndicatorSnapshot[]
    news: NewsItem[]
    sourceErrors: string[]
  }
  apiKey: string
  baseUrl: string
  model: string
}): Promise<AiBriefingPayload & { model?: string }> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "你是长期资产配置教练。你的重点是资产配置、现金拖累、新增资金去向、再平衡纪律和财富自由路径。市场新闻和日涨跌通常是噪音，只能作为背景。你不提供具体标的买卖建议，不预测短期涨跌。必须只输出合法 JSON，不要 Markdown。",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "基于个人组合暴露和少量市场背景，生成一份长期配置体检简报。",
            requiredJsonShape: {
              status: "ok 或 partial",
              marketTemperature: "乐观 / 中性 / 谨慎 / 高风险，用来表达长期配置状态而不是今日市场情绪",
              summary: "中文摘要，重点说明长期配置是否健康、下一笔钱该优先考虑哪里、哪些信息是噪音",
              keyChanges: ["长期配置事实1", "长期配置事实2"],
              affectedBuckets: ["资产桶"],
              reviewQuestions: ["围绕新增资金、现金拖累、回撤承受力的复盘问题"],
              uncertainties: ["不确定性"],
              signals: [
                {
                  title: "信号标题",
                  severity: "info / watch / risk",
                  affectedBuckets: ["资产桶"],
                  summary: "信号解释",
                  suggestedAction: "只允许规划新增资金、补低配资产桶、暂缓加重超配资产桶、检查现金安全垫、复盘最大回撤承受力、等待更多信息",
                },
              ],
            },
            portfolio: input.portfolio,
            indicators: input.indicators,
            news: input.news.slice(0, 5),
            sourceErrors: input.sourceErrors,
            outputRules: [
              "不要给买入、卖出、加仓、减仓某个标的的指令",
              "建议动作只能是规划新增资金、补低配资产桶、暂缓加重超配资产桶、检查现金安全垫、复盘最大回撤承受力、等待更多信息",
              "优先解释长期配置偏离，不要复述新闻标题",
              "如果新闻不影响长期配置假设，就明确视为噪音",
              `affectedBuckets 必须使用这些中文名称: ${Object.values(bucketDisplayNames).join("、")}`,
            ],
          }),
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`AI 简报生成失败: HTTP ${response.status} ${errorText}`)
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content

  if (!content) {
    throw new Error("AI 未返回简报内容")
  }

  return { ...JSON.parse(content), model }
}

function normalizeBriefingBuckets(briefing: AiBriefingPayload & { model?: string | null }) {
  return {
    ...briefing,
    affectedBuckets: briefing.affectedBuckets.map(formatBucketName),
    signals: briefing.signals.map((signal) => ({
      ...signal,
      affectedBuckets: signal.affectedBuckets.map(formatBucketName),
    })),
  }
}

function formatBucketName(bucket: string) {
  return bucketDisplayNames[bucket] || bucket
}

export async function refreshMarketRadar(userId: string) {
  const [{ indicators, errors: indicatorErrors }, newsResult, portfolio] = await Promise.all([
    collectIndicatorSnapshots(),
    fetchMarketNews().then(
      (news) => ({ news, errors: [] as string[] }),
      (error) => ({
        news: [] as NewsItem[],
        errors: [error instanceof Error ? error.message : String(error)],
      })
    ),
    buildPortfolioContext(userId),
  ])

  await prisma.marketIndicatorSnapshot.createMany({
    data: indicators.map((indicator) => ({
      userId,
      symbol: indicator.symbol,
      name: indicator.name,
      category: indicator.category,
      value: indicator.value,
      changePct: indicator.changePct,
      currency: indicator.currency,
      source: indicator.source,
      observedAt: indicator.observedAt,
    })),
  })

  const sourceErrors = [...indicatorErrors, ...newsResult.errors]
  let briefing: AiBriefingPayload & { model?: string | null }

  try {
    briefing = await generateAiBriefing({
      portfolio,
      indicators,
      news: newsResult.news,
      sourceErrors,
    })
  } catch (error) {
    briefing = {
      ...fallbackBriefing({
        portfolio,
        indicators,
        news: newsResult.news,
        sourceErrors: [
          ...sourceErrors,
          `OpenAI 简报生成失败: ${formatError(error)}`,
        ],
      }),
      model: null,
    }
  }

  const normalizedBriefing = normalizeBriefingBuckets(briefing)

  return prisma.marketBriefing.create({
    data: {
      userId,
      status: normalizedBriefing.status,
      marketTemperature: normalizedBriefing.marketTemperature,
      summary: normalizedBriefing.summary,
      keyChanges: normalizedBriefing.keyChanges as Prisma.InputJsonValue,
      affectedBuckets: normalizedBriefing.affectedBuckets as Prisma.InputJsonValue,
      reviewQuestions: normalizedBriefing.reviewQuestions as Prisma.InputJsonValue,
      uncertainties: normalizedBriefing.uncertainties as Prisma.InputJsonValue,
      signals: normalizedBriefing.signals as unknown as Prisma.InputJsonValue,
      sourceSnapshot: {
        indicators: indicators.map((indicator) => ({
          ...indicator,
          observedAt: indicator.observedAt.toISOString(),
        })),
        news: newsResult.news,
        sourceErrors,
        portfolio,
      } as unknown as Prisma.InputJsonValue,
      model: normalizedBriefing.model || null,
    },
  })
}

export async function getMarketRadarBriefings(userId: string, limit = 10) {
  return prisma.marketBriefing.findMany({
    where: { userId },
    orderBy: { observedAt: "desc" },
    take: limit,
  })
}
