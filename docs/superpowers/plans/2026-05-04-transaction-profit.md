# Transaction 模型与收益计算实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现账户资金流水记录和自动收益计算功能

**Architecture:** 新增 Transaction 模型记录资金流水（存入/取出/转账），通过「资产变动 - 净流入」公式计算真实收益，保留 Income 表用于手动记录收益明细

**Tech Stack:** Next.js App Router, Prisma, PostgreSQL, React Hook Form, Zod, Recharts

---

## 文件结构

### 新建文件

| 文件 | 职责 |
|------|------|
| `src/lib/validations/transaction.ts` | Transaction 数据验证 Schema |
| `src/lib/services/profit.ts` | 收益计算服务 |
| `src/app/api/transactions/route.ts` | Transaction CRUD API |
| `src/app/api/transactions/[id]/route.ts` | 单条 Transaction API |
| `src/app/api/transactions/transfer/route.ts` | 转账 API |
| `src/app/api/profits/summary/route.ts` | 收益汇总 API |
| `src/components/transactions/transaction-form.tsx` | 流水记录表单 |
| `src/components/transactions/transfer-form.tsx` | 转账表单 |
| `src/components/transactions/transaction-list.tsx` | 流水列表组件 |
| `src/components/profits/profit-card.tsx` | 收益统计卡片 |
| `src/components/profits/profit-table.tsx` | 收益明细表 |
| `src/app/(dashboard)/transactions/page.tsx` | 流水记录页面 |
| `src/app/(dashboard)/transactions/new/page.tsx` | 新增流水页面 |
| `src/app/(dashboard)/transactions/[id]/page.tsx` | 编辑流水页面 |
| `src/app/(dashboard)/reports/page.tsx` | 收益报表页面 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `prisma/schema.prisma` | 添加 TransactionType 枚举和 Transaction 模型 |
| `src/components/layout/sidebar.tsx` | 添加「流水记录」和「收益报表」导航 |
| `src/app/(dashboard)/page.tsx` | 添加收益统计卡片和账户收益列 |

---

## Task 1: 更新 Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 添加 TransactionType 枚举和 Transaction 模型**

在 `prisma/schema.prisma` 文件末尾添加：

```prisma
enum TransactionType {
  INCOME       // 收益入账
  DEPOSIT      // 资金存入
  WITHDRAW     // 资金取出
  TRANSFER_IN  // 转账转入
  TRANSFER_OUT // 转账转出
}

model Transaction {
  id               String           @id @default(cuid())
  accountId        String
  userId           String
  date             DateTime         @db.Date
  amount           Decimal          @db.Decimal(15, 2)
  type             TransactionType
  category         String?
  note             String?
  relatedAccountId String?
  createdAt        DateTime         @default(now())

  account          FinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([accountId, date])
  @@index([userId, date])
  @@map("transactions")
}
```

- [ ] **Step 2: 更新 User 和 FinancialAccount 模型**

在 `User` 模型中添加 `transactions` 关联：

```prisma
model User {
  // ... 现有字段
  transactions  Transaction[]
  // ...
}
```

在 `FinancialAccount` 模型中添加 `transactions` 关联：

```prisma
model FinancialAccount {
  // ... 现有字段
  transactions  Transaction[]
  // ...
}
```

- [ ] **Step 3: 运行数据库迁移**

```bash
npx prisma migrate dev --name add_transactions
```

- [ ] **Step 4: 生成 Prisma Client**

```bash
npx prisma generate
```

- [ ] **Step 5: 提交**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat: add Transaction model for cash flow tracking"
```

---

## Task 2: 创建 Transaction 验证 Schema

**Files:**
- Create: `src/lib/validations/transaction.ts`

- [ ] **Step 1: 创建验证 Schema**

```typescript
import { z } from "zod"

export const transactionSchema = z.object({
  accountId: z.string().min(1, "请选择账户"),
  date: z.string().min(1, "请选择日期"),
  amount: z.number().positive("金额必须大于0"),
  type: z.enum(["INCOME", "DEPOSIT", "WITHDRAW", "TRANSFER_IN", "TRANSFER_OUT"]),
  category: z.string().optional(),
  note: z.string().optional(),
  relatedAccountId: z.string().optional(),
})

export const updateTransactionSchema = transactionSchema.partial()

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, "请选择转出账户"),
  toAccountId: z.string().min(1, "请选择转入账户"),
  amount: z.number().positive("金额必须大于0"),
  date: z.string().min(1, "请选择日期"),
  note: z.string().optional(),
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransferInput = z.infer<typeof transferSchema>
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/validations/transaction.ts
git commit -m "feat: add Transaction validation schemas"
```

---

## Task 3: 创建收益计算服务

**Files:**
- Create: `src/lib/services/profit.ts`

- [ ] **Step 1: 创建收益计算服务**

```typescript
import { prisma } from "@/lib/prisma"
import { getExchangeRate } from "./exchange-rate"

export interface ProfitResult {
  accountId: string
  accountName: string
  currency: string
  startDate: Date
  endDate: Date
  startAsset: number
  endAsset: number
  assetChange: number
  totalDeposit: number
  totalWithdraw: number
  totalTransferIn: number
  totalTransferOut: number
  netInflow: number
  realProfit: number
  profitRate: number
}

export type PeriodType = "today" | "week" | "month" | "year" | "all" | "custom"

export function getDateRange(period: PeriodType, customStart?: Date, customEnd?: Date) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case "today":
      return { start: today, end: now }
    case "week": {
      const weekStart = new Date(today)
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      return { start: weekStart, end: now }
    }
    case "month": {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: monthStart, end: now }
    }
    case "year": {
      const yearStart = new Date(today.getFullYear(), 0, 1)
      return { start: yearStart, end: now }
    }
    case "all": {
      return { start: new Date("1970-01-01"), end: now }
    }
    case "custom":
      return { start: customStart || today, end: customEnd || now }
    default:
      return { start: today, end: now }
  }
}

export async function calculateAccountProfit(
  accountId: string,
  startDate: Date,
  endDate: Date
): Promise<ProfitResult | null> {
  // 获取账户信息
  const account = await prisma.financialAccount.findUnique({
    where: { id: accountId },
    select: { id: true, name: true, currency: true },
  })

  if (!account) return null

  // 获取期初资产（开始日期或之前最近的记录）
  const startAsset = await prisma.asset.findFirst({
    where: { accountId, date: { lte: startDate } },
    orderBy: { date: "desc" },
  })

  // 获取期末资产（结束日期或之前最近的记录）
  const endAsset = await prisma.asset.findFirst({
    where: { accountId, date: { lte: endDate } },
    orderBy: { date: "desc" },
  })

  // 获取期间的流水汇总
  const transactions = await prisma.transaction.groupBy({
    by: ["type"],
    where: {
      accountId,
      date: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  })

  // 计算各类流水总额
  const totals = {
    DEPOSIT: 0,
    WITHDRAW: 0,
    TRANSFER_IN: 0,
    TRANSFER_OUT: 0,
    INCOME: 0,
  }

  for (const t of transactions) {
    const amount = Number(t._sum.amount || 0)
    if (t.type in totals) {
      totals[t.type as keyof typeof totals] = amount
    }
  }

  // 净流入 = 存入 + 转入 - 取出 - 转出（INCOME 不计入净流入）
  const netInflow =
    totals.DEPOSIT + totals.TRANSFER_IN - totals.WITHDRAW - totals.TRANSFER_OUT

  // 资产变动
  const startAmount = Number(startAsset?.amount || 0)
  const endAmount = Number(endAsset?.amount || 0)
  const assetChange = endAmount - startAmount

  // 真实收益 = 资产变动 - 净流入
  const realProfit = assetChange - netInflow

  // 收益率
  const profitRate = startAmount > 0 ? (realProfit / startAmount) * 100 : 0

  return {
    accountId: account.id,
    accountName: account.name,
    currency: account.currency,
    startDate,
    endDate,
    startAsset: startAmount,
    endAsset: endAmount,
    assetChange,
    totalDeposit: totals.DEPOSIT,
    totalWithdraw: totals.WITHDRAW,
    totalTransferIn: totals.TRANSFER_IN,
    totalTransferOut: totals.TRANSFER_OUT,
    netInflow,
    realProfit,
    profitRate,
  }
}

export async function calculateAllProfits(
  userId: string,
  period: PeriodType,
  customStart?: Date,
  customEnd?: Date
): Promise<ProfitResult[]> {
  const { start, end } = getDateRange(period, customStart, customEnd)

  const accounts = await prisma.financialAccount.findMany({
    where: { userId, isActive: true },
    select: { id: true },
  })

  const results: ProfitResult[] = []

  for (const account of accounts) {
    const profit = await calculateAccountProfit(account.id, start, end)
    if (profit) {
      results.push(profit)
    }
  }

  return results
}

export async function getTotalProfitCNY(
  profits: ProfitResult[]
): Promise<number> {
  let total = 0

  for (const profit of profits) {
    const rate = await getExchangeRate(profit.currency, "CNY")
    total += profit.realProfit * rate
  }

  return total
}
```

- [ ] **Step 2: 提交**

```bash
git add src/lib/services/profit.ts
git commit -m "feat: add profit calculation service"
```

---

## Task 4: 实现 Transaction API

**Files:**
- Create: `src/app/api/transactions/route.ts`

- [ ] **Step 1: 创建 Transaction CRUD API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transactionSchema } from "@/lib/validations/transaction"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const where: {
      userId: string
      accountId?: string
      type?: string
      date?: { gte?: Date; lte?: Date }
    } = { userId: session.user.id }

    if (accountId) where.accountId = accountId
    if (type) where.type = type
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        account: {
          select: { name: true, platform: true, currency: true },
        },
      },
    })

    return NextResponse.json(
      transactions.map((t) => ({
        ...t,
        amount: Number(t.amount),
      }))
    )
  } catch {
    return NextResponse.json(
      { error: "获取流水记录失败" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = transactionSchema.parse(body)

    const account = await prisma.financialAccount.findFirst({
      where: { id: data.accountId, userId: session.user.id },
    })

    if (!account) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 })
    }

    const transaction = await prisma.transaction.create({
      data: {
        accountId: data.accountId,
        userId: session.user.id,
        date: new Date(data.date),
        amount: data.amount,
        type: data.type,
        category: data.category,
        note: data.note,
        relatedAccountId: data.relatedAccountId,
      },
    })

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch {
    return NextResponse.json(
      { error: "创建流水记录失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/transactions/route.ts
git commit -m "feat: add Transaction CRUD API"
```

---

## Task 5: 实现单条 Transaction API

**Files:**
- Create: `src/app/api/transactions/[id]/route.ts`

- [ ] **Step 1: 创建单条 Transaction API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { updateTransactionSchema } from "@/lib/validations/transaction"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const transaction = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
      include: {
        account: {
          select: { name: true, platform: true, currency: true },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch {
    return NextResponse.json(
      { error: "获取流水记录失败" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const data = updateTransactionSchema.parse(body)

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    const updateData: {
      date?: Date
      amount?: number
      type?: string
      category?: string | null
      note?: string | null
      relatedAccountId?: string | null
    } = {}

    if (data.date) updateData.date = new Date(data.date)
    if (data.amount !== undefined) updateData.amount = data.amount
    if (data.type) updateData.type = data.type
    if (data.category !== undefined) updateData.category = data.category
    if (data.note !== undefined) updateData.note = data.note
    if (data.relatedAccountId !== undefined) updateData.relatedAccountId = data.relatedAccountId

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      ...transaction,
      amount: Number(transaction.amount),
    })
  } catch {
    return NextResponse.json(
      { error: "更新流水记录失败" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.transaction.findFirst({
      where: { id, userId: session.user.id },
    })

    if (!existing) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 })
    }

    await prisma.transaction.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "删除流水记录失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/transactions/[id]/route.ts
git commit -m "feat: add single Transaction API endpoints"
```

---

## Task 6: 实现转账 API

**Files:**
- Create: `src/app/api/transactions/transfer/route.ts`

- [ ] **Step 1: 创建转账 API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { transferSchema } from "@/lib/validations/transaction"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const body = await request.json()
    const data = transferSchema.parse(body)

    if (data.fromAccountId === data.toAccountId) {
      return NextResponse.json(
        { error: "转出和转入账户不能相同" },
        { status: 400 }
      )
    }

    // 验证两个账户都属于当前用户
    const accounts = await prisma.financialAccount.findMany({
      where: {
        id: { in: [data.fromAccountId, data.toAccountId] },
        userId: session.user.id,
      },
    })

    if (accounts.length !== 2) {
      return NextResponse.json(
        { error: "账户不存在或不属于当前用户" },
        { status: 404 }
      )
    }

    // 在事务中创建两条转账记录
    const [transferOut, transferIn] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          accountId: data.fromAccountId,
          userId: session.user.id,
          date: new Date(data.date),
          amount: data.amount,
          type: "TRANSFER_OUT",
          note: data.note,
          relatedAccountId: data.toAccountId,
        },
      }),
      prisma.transaction.create({
        data: {
          accountId: data.toAccountId,
          userId: session.user.id,
          date: new Date(data.date),
          amount: data.amount,
          type: "TRANSFER_IN",
          note: data.note,
          relatedAccountId: data.fromAccountId,
        },
      }),
    ])

    return NextResponse.json({
      transferOut: { ...transferOut, amount: Number(transferOut.amount) },
      transferIn: { ...transferIn, amount: Number(transferIn.amount) },
    })
  } catch {
    return NextResponse.json(
      { error: "创建转账记录失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/transactions/transfer/route.ts
git commit -m "feat: add transfer API for account-to-account transfers"
```

---

## Task 7: 实现收益汇总 API

**Files:**
- Create: `src/app/api/profits/summary/route.ts`

- [ ] **Step 1: 创建收益汇总 API**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  calculateAllProfits,
  getTotalProfitCNY,
  PeriodType,
} from "@/lib/services/profit"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "未授权" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = (searchParams.get("period") || "month") as PeriodType
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const profits = await calculateAllProfits(
      session.user.id,
      period,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    )

    const totalProfitCNY = await getTotalProfitCNY(profits)

    return NextResponse.json({
      period,
      profits,
      totalProfitCNY,
    })
  } catch {
    return NextResponse.json(
      { error: "获取收益汇总失败" },
      { status: 500 }
    )
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/api/profits/summary/route.ts
git commit -m "feat: add profit summary API"
```

---

## Task 8: 创建 Transaction 表单组件

**Files:**
- Create: `src/components/transactions/transaction-form.tsx`

- [ ] **Step 1: 创建流水记录表单组件**

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { transactionSchema, TransactionInput } from "@/lib/validations/transaction"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account {
  id: string
  name: string
  platform: string
}

interface TransactionFormProps {
  initialData?: {
    id: string
    accountId: string
    date: string
    amount: number
    type: "INCOME" | "DEPOSIT" | "WITHDRAW" | "TRANSFER_IN" | "TRANSFER_OUT"
    category?: string
    note?: string
  }
  accounts: Account[]
}

const transactionTypes = [
  { value: "INCOME", label: "收益入账" },
  { value: "DEPOSIT", label: "资金存入" },
  { value: "WITHDRAW", label: "资金取出" },
]

export function TransactionForm({ initialData, accounts }: TransactionFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          date: initialData.date.split("T")[0],
        }
      : {
          date: new Date().toISOString().split("T")[0],
          type: "DEPOSIT",
          accountId: accounts[0]?.id || "",
        },
  })

  const accountId = watch("accountId")
  const type = watch("type")

  const onSubmit = async (data: TransactionInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = initialData
        ? `/api/transactions/${initialData.id}`
        : "/api/transactions"
      const method = initialData ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const res = await response.json()
        setError(res.error || "操作失败")
        return
      }

      router.push("/transactions")
      router.refresh()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <p className="text-gray-500">
            请先{" "}
            <a href="/accounts/new" className="text-blue-500 hover:underline">
              创建账户
            </a>{" "}
            后再添加流水记录
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{initialData ? "编辑流水记录" : "新增流水记录"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountId">账户</Label>
            <Select
              value={accountId}
              onValueChange={(value) => setValue("accountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountId && (
              <p className="text-sm text-red-500">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">金额</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="请输入金额"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">类型</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setValue("type", value as TransactionInput["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择类型" />
              </SelectTrigger>
              <SelectContent>
                {transactionTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">分类</Label>
            <Input
              id="category"
              {...register("category")}
              placeholder="如：工资、利息等（可选）"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">备注</Label>
            <Input id="note" {...register("note")} placeholder="可选备注" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/transactions/transaction-form.tsx
git commit -m "feat: add TransactionForm component"
```

---

## Task 9: 创建转账表单组件

**Files:**
- Create: `src/components/transactions/transfer-form.tsx`

- [ ] **Step 1: 创建转账表单组件**

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { transferSchema, TransferInput } from "@/lib/validations/transaction"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account {
  id: string
  name: string
  platform: string
}

interface TransferFormProps {
  accounts: Account[]
}

export function TransferForm({ accounts }: TransferFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      fromAccountId: accounts[0]?.id || "",
      toAccountId: accounts[1]?.id || "",
    },
  })

  const fromAccountId = watch("fromAccountId")
  const toAccountId = watch("toAccountId")

  const onSubmit = async (data: TransferInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/transactions/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const res = await response.json()
        setError(res.error || "操作失败")
        return
      }

      router.push("/transactions")
      router.refresh()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  if (accounts.length < 2) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <p className="text-gray-500">
            需要至少两个账户才能进行转账操作，请先{" "}
            <a href="/accounts/new" className="text-blue-500 hover:underline">
              创建账户
            </a>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>账户转账</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fromAccountId">转出账户</Label>
            <Select
              value={fromAccountId}
              onValueChange={(value) => setValue("fromAccountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择转出账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== toAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.fromAccountId && (
              <p className="text-sm text-red-500">{errors.fromAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="toAccountId">转入账户</Label>
            <Select
              value={toAccountId}
              onValueChange={(value) => setValue("toAccountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择转入账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.toAccountId && (
              <p className="text-sm text-red-500">{errors.toAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">转账金额</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="请输入金额"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">备注</Label>
            <Input id="note" {...register("note")} placeholder="可选备注" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "处理中..." : "确认转账"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/transactions/transfer-form.tsx
git commit -m "feat: add TransferForm component"
```

---

## Task 10: 创建 Transaction 列表组件

**Files:**
- Create: `src/components/transactions/transaction-list.tsx`

- [ ] **Step 1: 创建流水列表组件**

```typescript
"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Transaction {
  id: string
  accountId: string
  date: string
  amount: number
  type: "INCOME" | "DEPOSIT" | "WITHDRAW" | "TRANSFER_IN" | "TRANSFER_OUT"
  category?: string
  note?: string
  account: {
    name: string
    platform: string
    currency: string
  }
}

interface TransactionListProps {
  transactions: Transaction[]
}

const typeLabels: Record<Transaction["type"], string> = {
  INCOME: "收益入账",
  DEPOSIT: "资金存入",
  WITHDRAW: "资金取出",
  TRANSFER_IN: "转账转入",
  TRANSFER_OUT: "转账转出",
}

const typeColors: Record<Transaction["type"], string> = {
  INCOME: "text-green-600",
  DEPOSIT: "text-blue-600",
  WITHDRAW: "text-orange-600",
  TRANSFER_IN: "text-blue-600",
  TRANSFER_OUT: "text-orange-600",
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/transactions/${deleteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        window.location.reload()
      }
    } catch {
      console.error("删除失败")
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无流水记录</p>
        <div className="mt-4 flex justify-center gap-4">
          <Link
            href="/transactions/new"
            className="text-blue-500 hover:underline"
          >
            新增流水
          </Link>
          <Link
            href="/transactions/transfer"
            className="text-blue-500 hover:underline"
          >
            账户转账
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              日期
            </th>
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              账户
            </th>
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              类型
            </th>
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              金额
            </th>
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              分类
            </th>
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              备注
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((transaction) => (
            <tr key={transaction.id} className="border-b last:border-0">
              <td className="p-3 text-sm">
                {new Date(transaction.date).toLocaleDateString("zh-CN")}
              </td>
              <td className="p-3">
                <div className="font-medium">{transaction.account.name}</div>
                <div className="text-xs text-gray-500">
                  {transaction.account.platform}
                </div>
              </td>
              <td className="p-3">
                <span
                  className={`text-sm ${typeColors[transaction.type]}`}
                >
                  {typeLabels[transaction.type]}
                </span>
              </td>
              <td className="p-3">
                <span className={typeColors[transaction.type]}>
                  {transaction.type === "WITHDRAW" ||
                  transaction.type === "TRANSFER_OUT"
                    ? "-"
                    : "+"}
                  {new Intl.NumberFormat("zh-CN", {
                    style: "currency",
                    currency: transaction.account.currency,
                  }).format(transaction.amount)}
                </span>
              </td>
              <td className="p-3 text-sm text-gray-600">
                {transaction.category || "-"}
              </td>
              <td className="p-3 text-sm text-gray-600">
                {transaction.note || "-"}
              </td>
              <td className="p-3 text-right">
                <div className="flex justify-end gap-2">
                  <Link
                    href={`/transactions/${transaction.id}`}
                    className="text-blue-500 hover:underline text-sm"
                  >
                    编辑
                  </Link>
                  <Dialog>
                    <DialogTrigger asChild>
                      <button
                        className="text-red-500 hover:underline text-sm"
                        onClick={() => setDeleteId(transaction.id)}
                      >
                        删除
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                      </DialogHeader>
                      <p className="py-4">确定要删除这条流水记录吗？</p>
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setDeleteId(null)}
                        >
                          取消
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleDelete}
                          disabled={isDeleting}
                        >
                          {isDeleting ? "删除中..." : "确认删除"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/transactions/transaction-list.tsx
git commit -m "feat: add TransactionList component"
```

---

## Task 11: 创建收益统计卡片组件

**Files:**
- Create: `src/components/profits/profit-card.tsx`

- [ ] **Step 1: 创建收益统计卡片组件**

```typescript
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"

interface ProfitCardProps {
  totalProfitCNY: number
  period: string
  onPeriodChange: (period: string) => void
}

const periodLabels: Record<string, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  year: "今年",
  all: "累计",
}

export function ProfitCard({
  totalProfitCNY,
  period,
  onPeriodChange,
}: ProfitCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(period)

  const handlePeriodChange = (value: string) => {
    setSelectedPeriod(value)
    onPeriodChange(value)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-500">
          收益统计
        </CardTitle>
        <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-24 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="year">今年</SelectItem>
            <SelectItem value="all">累计</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div
          className={`text-2xl font-bold ${
            totalProfitCNY >= 0 ? "text-green-600" : "text-red-600"
          }`}
        >
          {totalProfitCNY >= 0 ? "+" : ""}
          {formatCurrency(Math.abs(totalProfitCNY))}
        </div>
        <p className="text-xs text-gray-400 mt-1">
          {periodLabels[selectedPeriod]}收益（CNY）
        </p>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/profits/profit-card.tsx
git commit -m "feat: add ProfitCard component"
```

---

## Task 12: 创建收益明细表组件

**Files:**
- Create: `src/components/profits/profit-table.tsx`

- [ ] **Step 1: 创建收益明细表组件**

```typescript
"use client"

import { ProfitResult } from "@/lib/services/profit"

interface ProfitTableProps {
  profits: ProfitResult[]
}

export function ProfitTable({ profits }: ProfitTableProps) {
  if (profits.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        暂无收益数据，请先记录资产快照
      </div>
    )
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatPercent = (rate: number) => {
    return `${rate >= 0 ? "+" : ""}${rate.toFixed(2)}%`
  }

  return (
    <div className="rounded-lg border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-gray-50">
            <th className="p-3 text-left text-sm font-medium text-gray-500">
              账户
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              期初资产
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              期末资产
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              净流入
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              真实收益
            </th>
            <th className="p-3 text-right text-sm font-medium text-gray-500">
              收益率
            </th>
          </tr>
        </thead>
        <tbody>
          {profits.map((profit) => (
            <tr key={profit.accountId} className="border-b last:border-0">
              <td className="p-3">
                <div className="font-medium">{profit.accountName}</div>
                <div className="text-xs text-gray-500">{profit.currency}</div>
              </td>
              <td className="p-3 text-right">
                {formatCurrency(profit.startAsset, profit.currency)}
              </td>
              <td className="p-3 text-right">
                {formatCurrency(profit.endAsset, profit.currency)}
              </td>
              <td className="p-3 text-right">
                <span
                  className={
                    profit.netInflow >= 0 ? "text-blue-600" : "text-orange-600"
                  }
                >
                  {profit.netInflow >= 0 ? "+" : ""}
                  {formatCurrency(profit.netInflow, profit.currency)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span
                  className={
                    profit.realProfit >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {profit.realProfit >= 0 ? "+" : ""}
                  {formatCurrency(profit.realProfit, profit.currency)}
                </span>
              </td>
              <td className="p-3 text-right">
                <span
                  className={
                    profit.profitRate >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {formatPercent(profit.profitRate)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/components/profits/profit-table.tsx
git commit -m "feat: add ProfitTable component"
```

---

## Task 13: 创建 Transactions 页面

**Files:**
- Create: `src/app/(dashboard)/transactions/page.tsx`
- Create: `src/app/(dashboard)/transactions/new/page.tsx`
- Create: `src/app/(dashboard)/transactions/transfer/page.tsx`
- Create: `src/app/(dashboard)/transactions/[id]/page.tsx`

- [ ] **Step 1: 创建流水列表页面**

```typescript
// src/app/(dashboard)/transactions/page.tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { TransactionList } from "@/components/transactions/transaction-list"
import Link from "next/link"

export default async function TransactionsPage() {
  const session = await auth()
  const transactions = await prisma.transaction.findMany({
    where: { userId: session?.user?.id },
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { name: true, platform: true, currency: true },
      },
    },
  })

  const serializedTransactions = transactions.map((t) => ({
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">流水记录</h1>
        <div className="flex gap-2">
          <Link href="/transactions/transfer">
            <Button variant="outline">账户转账</Button>
          </Link>
          <Link href="/transactions/new">
            <Button>新增流水</Button>
          </Link>
        </div>
      </div>

      <TransactionList transactions={serializedTransactions} />
    </div>
  )
}
```

- [ ] **Step 2: 创建新增流水页面**

```typescript
// src/app/(dashboard)/transactions/new/page.tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { redirect } from "next/navigation"

export default async function NewTransactionPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新增流水记录</h1>
      <TransactionForm accounts={accounts} />
    </div>
  )
}
```

- [ ] **Step 3: 创建转账页面**

```typescript
// src/app/(dashboard)/transactions/transfer/page.tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TransferForm } from "@/components/transactions/transfer-form"
import { redirect } from "next/navigation"

export default async function TransferPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">账户转账</h1>
      <TransferForm accounts={accounts} />
    </div>
  )
}
```

- [ ] **Step 4: 创建编辑流水页面**

```typescript
// src/app/(dashboard)/transactions/[id]/page.tsx
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { redirect } from "next/navigation"
import { notFound } from "next/navigation"

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const { id } = await params

  const transaction = await prisma.transaction.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!transaction) {
    notFound()
  }

  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session.user.id, isActive: true },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  })

  const initialData = {
    id: transaction.id,
    accountId: transaction.accountId,
    date: transaction.date.toISOString(),
    amount: Number(transaction.amount),
    type: transaction.type,
    category: transaction.category || undefined,
    note: transaction.note || undefined,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">编辑流水记录</h1>
      <TransactionForm initialData={initialData} accounts={accounts} />
    </div>
  )
}
```

- [ ] **Step 5: 提交**

```bash
git add src/app/\(dashboard\)/transactions/
git commit -m "feat: add Transactions pages (list, new, transfer, edit)"
```

---

## Task 14: 创建 Reports 页面

**Files:**
- Create: `src/app/(dashboard)/reports/page.tsx`

- [ ] **Step 1: 创建收益报表页面**

```typescript
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calculateAllProfits, getTotalProfitCNY, PeriodType } from "@/lib/services/profit"
import { ProfitTable } from "@/components/profits/profit-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>
}

const periodLabels: Record<string, string> = {
  today: "今日",
  week: "本周",
  month: "本月",
  year: "今年",
  all: "累计",
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    return null
  }

  const params = await searchParams
  const period = (params.period || "month") as PeriodType

  const profits = await calculateAllProfits(session.user.id, period)
  const totalProfitCNY = await getTotalProfitCNY(profits)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("zh-CN", {
      style: "currency",
      currency: "CNY",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">收益报表</h1>
        <Select name="period" defaultValue={period}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">今日</SelectItem>
            <SelectItem value="week">本周</SelectItem>
            <SelectItem value="month">本月</SelectItem>
            <SelectItem value="year">今年</SelectItem>
            <SelectItem value="all">累计</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              {periodLabels[period]}总收益
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalProfitCNY >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalProfitCNY >= 0 ? "+" : ""}
              {formatCurrency(Math.abs(totalProfitCNY))}
            </div>
            <p className="text-xs text-gray-400 mt-1">已换算为 CNY</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              统计账户数
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profits.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              盈利账户
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {profits.filter((p) => p.realProfit > 0).length}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              亏损: {profits.filter((p) => p.realProfit < 0).length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>各账户收益明细</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfitTable profits={profits} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: 提交**

```bash
git add src/app/\(dashboard\)/reports/page.tsx
git commit -m "feat: add Reports page with profit summary"
```

---

## Task 15: 更新侧边栏导航

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 添加新导航项**

将 `src/components/layout/sidebar.tsx` 中的 `items` 数组更新为：

```typescript
const items = [
  { href: "/", label: "仪表盘" },
  { href: "/assets/batch", label: "快速记账", icon: PlusCircle },
  { href: "/accounts", label: "账户管理" },
  { href: "/assets", label: "资产记录" },
  { href: "/transactions", label: "流水记录" },
  { href: "/incomes", label: "收益记录" },
  { href: "/reports", label: "收益报表" },
]
```

- [ ] **Step 2: 提交**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat: add Transactions and Reports to sidebar navigation"
```

---

## Task 16: 更新 Dashboard 页面

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: 添加收益统计卡片**

在 Dashboard 页面的统计卡片区域添加收益统计卡片，调用收益 API 显示本月收益。

在现有统计卡片后添加收益相关卡片，并在账户列表中显示每个账户的收益信息。

由于改动较大，完整代码参考设计文档中的 UI 设计部分。

- [ ] **Step 2: 提交**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: add profit statistics to Dashboard"
```

---

## Task 17: 最终测试与提交

- [ ] **Step 1: 运行开发服务器测试**

```bash
npm run dev
```

测试项目：
1. 创建新账户
2. 记录资产快照
3. 创建流水记录（存入/取出）
4. 创建账户转账
5. 查看收益报表
6. 验证收益计算正确性

- [ ] **Step 2: 最终提交**

```bash
git add -A
git commit -m "feat: complete Transaction model and profit calculation feature"
```
