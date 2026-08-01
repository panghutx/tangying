"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"

interface BucketRow {
  bucket: string
  label: string
  value: number
  share: number
  min: number
  max: number
}

interface PortfolioData {
  totalCNY: number
  profitCNY: number
  buckets: BucketRow[]
  cashValueCNY?: number
}

export function WealthDashboard({ portfolio }: { portfolio: PortfolioData }) {
  const [monthlyInvestment, setMonthlyInvestment] = usePersistedNumber("fire.monthlyInvestment", 12000)
  const [annualExpense, setAnnualExpense] = usePersistedNumber("fire.annualExpense", 120000)
  const [fireMultiple, setFireMultiple] = usePersistedNumber("fire.multiple", 25)
  const [expectedReturn, setExpectedReturn] = usePersistedNumber("fire.expectedReturn", 6)
  const [targetYears, setTargetYears] = usePersistedNumber("fire.targetYears", 10)

  const allocation = useMemo(() => buildAllocation(portfolio.buckets, portfolio.totalCNY), [portfolio])
  const plan = useMemo(
    () => buildContributionPlan(portfolio.buckets, portfolio.totalCNY, monthlyInvestment),
    [portfolio, monthlyInvestment]
  )
  const fire = useMemo(
    () =>
      buildFireProgress({
        currentAssets: portfolio.totalCNY,
        monthlyInvestment,
        annualExpense,
        fireMultiple,
        expectedReturn,
        targetYears,
      }),
    [portfolio.totalCNY, monthlyInvestment, annualExpense, fireMultiple, expectedReturn, targetYears]
  )

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="净资产" value={formatCNY(portfolio.totalCNY)} />
        <Metric title="配置偏离" value={`${allocation.driftScore.toFixed(1)} 分`} />
        <Metric title="FIRE 进度" value={`${fire.progress.toFixed(1)}%`} />
        <Metric title="预计达成" value={fire.yearsToFire === null ? "无法估算" : `${fire.yearsToFire.toFixed(1)} 年`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>财富自由进度</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-6 lg:grid-cols-[minmax(280px,420px)_1fr]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <NumberInput label="年支出" value={annualExpense} onChange={setAnnualExpense} />
              <NumberInput label="FIRE 倍数" value={fireMultiple} onChange={setFireMultiple} step="1" />
              <NumberInput label="年化收益假设 (%)" value={expectedReturn} onChange={setExpectedReturn} step="0.1" />
              <NumberInput label="达成前月投入" value={monthlyInvestment} onChange={setMonthlyInvestment} />
              <NumberInput label="希望达成年限" value={targetYears} onChange={setTargetYears} step="1" />
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Metric title="目标净资产" value={formatCNY(fire.targetAssets)} />
                <Metric title="当前净资产" value={formatCNY(portfolio.totalCNY)} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Metric title="完成率" value={`${fire.progress.toFixed(1)}%`} />
                <Metric title="预计达成" value={fire.yearsToFire === null ? "无法估算" : `${fire.yearsToFire.toFixed(1)} 年`} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Metric title="目标年化要求" value={fire.requiredAnnualReturn === null ? "已达成/无法估算" : `${fire.requiredAnnualReturn.toFixed(1)}%`} />
                <Metric title="当前储蓄率" value={`${fire.savingsRate.toFixed(1)}%`} />
              </div>
              <div>
                <Progress value={fire.progress} className="h-3" />
                <p className="mt-3 text-sm leading-6 text-gray-500">
                  FIRE number = 年支出 × FIRE 倍数。目标年化要求按“希望达成年限”和每月投入反推，用来判断收益目标是否现实。
                </p>
                <div className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <div>剩余缺口：{formatCNY(Math.max(0, fire.remaining))}</div>
                  <div>安全提取率：{fire.withdrawalRate.toFixed(2)}%</div>
                  <div>年投入：{formatCNY(monthlyInvestment * 12)}</div>
                  <div>路径判断：{fire.statusLabel}</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>长期配置体检</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 font-medium">资产桶</th>
                  <th className="py-2 font-medium">当前占比</th>
                  <th className="py-2 font-medium">目标区间</th>
                  <th className="py-2 font-medium">偏离金额</th>
                  <th className="py-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {allocation.rows.map((row) => (
                  <tr key={row.bucket} className="border-b last:border-0">
                    <td className="py-3 font-medium text-gray-900">{row.label}</td>
                    <td className="py-3">{row.share.toFixed(2)}%</td>
                    <td className="py-3">
                      {row.min}% - {row.max}%
                    </td>
                    <td className="py-3">{row.driftAmount === 0 ? "¥0" : formatCNY(row.driftAmount)}</td>
                    <td className="py-3">
                      <span className={statusClass(row.status)}>{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>新增资金分配器</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-gray-500">
              使用上方“达成前月投入”金额计算。规则：优先补低于目标下限的资产桶；没有低配时，暂不强行给出方向。
            </p>
            {plan.allocations.length === 0 ? (
              <p className="text-sm text-gray-500">暂无明显低配资产桶。这笔钱可以先按你的主策略或等待月度复盘。</p>
            ) : (
              <div className="grid gap-3 lg:grid-cols-2">
                {plan.allocations.map((item) => (
                  <div key={item.bucket} className="grid gap-2 rounded-lg border p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="font-medium text-gray-900">{item.label}</div>
                      <div className="mt-1 text-sm text-gray-500">
                        当前 {item.currentShare.toFixed(2)}%，目标下限 {item.targetMin}%，缺口约 {formatCNY(item.gapAmount)}
                      </div>
                    </div>
                    <div className="text-lg font-semibold text-gray-900">{formatCNY(item.amount)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
    </div>
  )
}

function buildAllocation(buckets: BucketRow[], totalCNY: number) {
  const rows = buckets.map((bucket) => {
    const gapToMin = Math.max(0, bucket.min - bucket.share)
    const excessOverMax = Math.max(0, bucket.share - bucket.max)
    const driftPct = gapToMin || excessOverMax
    const driftAmount = totalCNY * (driftPct / 100)
    const status = gapToMin > 0 ? "低配" : excessOverMax > 0 ? "超配" : "正常"

    return {
      ...bucket,
      driftAmount,
      status,
    }
  })

  const driftScore = rows.reduce((sum, row) => sum + (row.driftAmount / Math.max(totalCNY, 1)) * 100, 0)

  return { rows, driftScore }
}

function buildContributionPlan(buckets: BucketRow[], totalCNY: number, amount: number) {
  const needs = buckets
    .map((bucket) => {
      const gapPct = Math.max(0, bucket.min - bucket.share)
      return {
        bucket: bucket.bucket,
        label: bucket.label,
        currentShare: bucket.share,
        targetMin: bucket.min,
        gapAmount: totalCNY * (gapPct / 100),
      }
    })
    .filter((bucket) => bucket.gapAmount > 0)
    .sort((a, b) => b.gapAmount - a.gapAmount)

  const totalGap = needs.reduce((sum, item) => sum + item.gapAmount, 0)
  if (amount <= 0 || totalGap <= 0) return { allocations: [] }

  return {
    allocations: needs.map((item) => ({
      ...item,
      amount: Math.min(item.gapAmount, amount * (item.gapAmount / totalGap)),
    })),
  }
}

function buildFireProgress({
  currentAssets,
  monthlyInvestment,
  annualExpense,
  fireMultiple,
  expectedReturn,
  targetYears,
}: {
  currentAssets: number
  monthlyInvestment: number
  annualExpense: number
  fireMultiple: number
  expectedReturn: number
  targetYears: number
}) {
  const safeMultiple = Math.max(0, fireMultiple)
  const targetAssets = annualExpense * safeMultiple
  const remaining = targetAssets - currentAssets
  const progress = targetAssets > 0 ? (currentAssets / targetAssets) * 100 : 0
  const monthlyReturn = expectedReturn / 100 / 12
  const monthlyContribution = Math.max(0, monthlyInvestment)
  const savingsRateBase = monthlyContribution + annualExpense / 12
  const savingsRate = savingsRateBase > 0 ? (monthlyContribution / savingsRateBase) * 100 : 0
  const withdrawalRate = safeMultiple > 0 ? 100 / safeMultiple : 0
  const requiredAnnualReturn = calculateRequiredAnnualReturn({
    currentAssets,
    monthlyContribution,
    targetAssets,
    targetYears,
  })

  if (remaining <= 0) {
    return { targetAssets, remaining, progress, yearsToFire: 0, statusLabel: "按当前支出已达成", savingsRate, withdrawalRate, requiredAnnualReturn }
  }

  if (monthlyContribution <= 0 && monthlyReturn <= 0) {
    return { targetAssets, remaining, progress, yearsToFire: null, statusLabel: "需提高投入或收益", savingsRate, withdrawalRate, requiredAnnualReturn }
  }

  let balance = currentAssets
  let months = 0
  while (balance < targetAssets && months < 1200) {
    balance = balance * (1 + monthlyReturn) + monthlyContribution
    months += 1
  }

  return {
    targetAssets,
    remaining,
    progress,
    yearsToFire: months >= 1200 ? null : months / 12,
    statusLabel: months >= 1200 ? "需提高投入或收益" : "可估算",
    savingsRate,
    withdrawalRate,
    requiredAnnualReturn,
  }
}

function calculateRequiredAnnualReturn({
  currentAssets,
  monthlyContribution,
  targetAssets,
  targetYears,
}: {
  currentAssets: number
  monthlyContribution: number
  targetAssets: number
  targetYears: number
}) {
  if (targetAssets <= 0 || currentAssets >= targetAssets || targetYears <= 0) return null

  const months = Math.round(targetYears * 12)
  if (currentAssets + monthlyContribution * months >= targetAssets) return 0

  let low = 0
  let high = 1

  for (let i = 0; i < 80; i += 1) {
    const mid = (low + high) / 2
    let balance = currentAssets
    for (let month = 0; month < months; month += 1) {
      balance = balance * (1 + mid) + monthlyContribution
    }
    if (balance >= targetAssets) {
      high = mid
    } else {
      low = mid
    }
  }

  return (Math.pow(1 + high, 12) - 1) * 100
}

function usePersistedNumber(key: string, defaultValue: number) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return defaultValue
    const saved = window.localStorage.getItem(key)
    if (saved === null) return defaultValue
    const parsed = Number(saved)
    return Number.isFinite(parsed) ? parsed : defaultValue
  })

  useEffect(() => {
    window.localStorage.setItem(key, String(value))
  }, [key, value])

  return [value, setValue] as const
}

function NumberInput({
  label,
  value,
  onChange,
  step = "1000",
}: {
  label: string
  value: number
  onChange: (value: number) => void
  step?: string
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input
        type="number"
        min="0"
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </div>
  )
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="mt-2 truncate text-xl font-semibold text-gray-900">{value}</div>
    </div>
  )
}

function statusClass(status: string) {
  const base = "rounded-full px-2.5 py-1 text-xs"
  if (status === "低配") return `${base} bg-blue-50 text-blue-700`
  if (status === "超配") return `${base} bg-amber-50 text-amber-700`
  return `${base} bg-emerald-50 text-emerald-700`
}

function formatCNY(amount: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 0,
  }).format(amount)
}
