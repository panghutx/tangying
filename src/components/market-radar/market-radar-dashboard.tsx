import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

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

interface RadarSignal {
  title: string
  severity: "info" | "watch" | "risk"
  affectedBuckets: string[]
  summary: string
  suggestedAction: string
}

interface MarketBriefingView {
  id: string
  status: string
  marketTemperature: string
  summary: string
  keyChanges: string[]
  affectedBuckets: string[]
  reviewQuestions: string[]
  uncertainties: string[]
  signals: RadarSignal[]
  model: string | null
  observedAt: string
  createdAt: string
}

export function MarketRadarDashboard({ briefings }: { briefings: MarketBriefingView[] }) {
  const latest = briefings[0]

  if (!latest) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-gray-500">
          还没有配置体检。点击右上角刷新，系统会结合你的资产桶、持仓和少量市场背景生成第一份长期配置简报。
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="配置状态" value={latest.marketTemperature} />
        <Metric title="配置信号" value={String(latest.signals.length)} />
        <Metric title="影响资产桶" value={String(latest.affectedBuckets.length)} />
        <Metric title="生成方式" value={latest.model || "规则降级"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>长期配置简报</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="leading-7 text-gray-800">{latest.summary}</p>
          <div className="text-xs text-gray-400">
            {formatDate(latest.observedAt)}
            {latest.status === "partial" ? " · 部分数据源不可用" : ""}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="配置事实" items={latest.keyChanges} />
        <Panel title="复盘问题" items={latest.reviewQuestions} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>配置体检信号</CardTitle>
        </CardHeader>
        <CardContent>
          {latest.signals.length === 0 ? (
            <p className="text-sm text-gray-500">这次体检没有发现明显配置偏离。</p>
          ) : (
            <div className="space-y-3">
              {latest.signals.map((signal, index) => (
                <div key={`${signal.title}-${index}`} className="rounded-lg border p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-gray-900">{signal.title}</h3>
                        <span className={severityClass(signal.severity)}>
                          {severityLabel(signal.severity)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">{signal.summary}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {signal.affectedBuckets.map((bucket) => (
                      <span key={bucket} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                        {formatBucketName(bucket)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-3 text-sm text-gray-700">配置动作：{signal.suggestedAction}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="影响资产桶" items={latest.affectedBuckets.map(formatBucketName)} />
        <Panel title="不确定性" items={latest.uncertainties} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>历史体检</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {briefings.slice(1).map((briefing) => (
              <div key={briefing.id} className="rounded-lg border p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div className="font-medium text-gray-900">{briefing.marketTemperature}</div>
                  <div className="text-xs text-gray-400">{formatDate(briefing.observedAt)}</div>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-600">{briefing.summary}</p>
              </div>
            ))}
            {briefings.length === 1 && <p className="text-sm text-gray-500">暂无更早的历史体检。</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <Card>
      <CardContent>
        <div className="text-sm text-gray-500">{title}</div>
        <div className="mt-2 truncate text-2xl font-semibold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  )
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">暂无内容。</p>
        ) : (
          <ul className="space-y-2 text-sm leading-6 text-gray-700">
            {items.map((item, index) => (
              <li key={`${item}-${index}`}>· {item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

function severityLabel(severity: RadarSignal["severity"]) {
  if (severity === "risk") return "风险"
  if (severity === "watch") return "关注"
  return "信息"
}

function severityClass(severity: RadarSignal["severity"]) {
  const base = "rounded-full px-2 py-0.5 text-xs"
  if (severity === "risk") return `${base} bg-red-50 text-red-700`
  if (severity === "watch") return `${base} bg-amber-50 text-amber-700`
  return `${base} bg-blue-50 text-blue-700`
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))
}

function formatBucketName(bucket: string) {
  return bucketDisplayNames[bucket] || bucket
}
