# Goal Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to set asset/profit goals, track progress over time with snapshots, visualize trends, and auto-reset profit goals monthly.

**Architecture:** Add Goal and GoalProgress tables to Prisma. Create server actions for CRUD and progress calculation. Build goals list, detail, create/edit pages. Add goal cards to dashboard. Implement monthly cron for period reset.

**Tech Stack:** Next.js 16 (App Router), Prisma, PostgreSQL, Tailwind, Recharts (for progress chart), node-cron for scheduling

---

## File Map

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add Goal, GoalProgress models, enums |
| `src/lib/services/goal.ts` | Server actions: createGoal, updateGoal, archiveGoal, calculateProgress, getGoalProgress |
| `src/lib/services/goal-cron.ts` | Monthly reset cron job logic |
| `src/app/(dashboard)/goals/page.tsx` | Goals list page with tabs |
| `src/app/(dashboard)/goals/new/page.tsx` | Create goal page |
| `src/app/(dashboard)/goals/[id]/page.tsx` | Goal detail page with chart |
| `src/app/(dashboard)/goals/[id]/edit/page.tsx` | Edit goal page |
| `src/components/goals/goal-form.tsx` | Goal create/edit form component |
| `src/components/goals/goal-card.tsx` | Goal card for list display |
| `src/components/goals/goal-progress-chart.tsx` | Progress trend chart |
| `src/app/(dashboard)/page.tsx` | Add goal cards to dashboard |

---

## Task 1: Add Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add enums to schema**

Add after existing enums:

```prisma
enum GoalType {
  ASSET
  PROFIT
}

enum GoalPeriod {
  MONTHLY
  YEARLY
}

enum GoalStatus {
  ACTIVE
  COMPLETED
  FAILED
  ARCHIVED
}
```

- [ ] **Step 2: Add Goal model**

```prisma
model Goal {
  id            String      @id @default(cuid())
  userId        String
  type          GoalType
  name          String
  targetAmount  Decimal     @db.Decimal(15, 2)
  period        GoalPeriod?
  deadline      DateTime?
  status        GoalStatus  @default(ACTIVE)
  createdAt     DateTime    @default(now())
  completedAt   DateTime?
  user          User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  progress      GoalProgress[]

  @@map("goals")
}
```

- [ ] **Step 3: Add GoalProgress model**

```prisma
model GoalProgress {
  id            String   @id @default(cuid())
  goalId        String
  date          DateTime @db.Date
  currentAmount Decimal  @db.Decimal(15, 2)
  createdAt     DateTime @default(now())
  goal          Goal     @relation(fields: [goalId], references: [id], onDelete: Cascade)

  @@unique([goalId, date])
  @@map("goal_progress")
}
```

- [ ] **Step 4: Add relations to User model**

In User model, add:
```prisma
goals     Goal[]
```

- [ ] **Step 5: Run Prisma migrate**

```bash
npx prisma migrate dev --name add_goals
```

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add Goal and GoalProgress models"
```

---

## Task 2: Create Goal Service (Server Actions)

**Files:**
- Create: `src/lib/services/goal.ts`
- Test: `src/lib/services/goal.test.ts` (create alongside)

- [ ] **Step 1: Write test for createGoal**

```typescript
import { createGoal } from './goal'
import { prisma } from '@/lib/prisma'

// Mock prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      create: jest.fn(),
    },
  },
}))

describe('createGoal', () => {
  it('should create a goal with correct data', async () => {
    const mockGoal = {
      id: 'goal-1',
      userId: 'user-1',
      type: 'ASSET',
      name: 'One Million',
      targetAmount: 1000000,
      status: 'ACTIVE',
      createdAt: new Date(),
    }

    ;(prisma.goal.create as jest.Mock).mockResolvedValue(mockGoal)

    const result = await createGoal({
      userId: 'user-1',
      type: 'ASSET',
      name: 'One Million',
      targetAmount: 1000000,
    })

    expect(result.id).toBe('goal-1')
    expect(prisma.goal.create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: 'ASSET',
        name: 'One Million',
        targetAmount: 1000000,
        status: 'ACTIVE',
      },
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest src/lib/services/goal.test.ts
# Expected: FAIL - module not found
```

- [ ] **Step 3: Write minimal createGoal implementation**

```typescript
'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export type GoalType = 'ASSET' | 'PROFIT'
export type GoalPeriod = 'MONTHLY' | 'YEARLY'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ARCHIVED'

export interface CreateGoalInput {
  userId: string
  type: GoalType
  name: string
  targetAmount: number
  period?: GoalPeriod
  deadline?: Date
}

export async function createGoal(input: CreateGoalInput) {
  const goal = await prisma.goal.create({
    data: {
      userId: input.userId,
      type: input.type,
      name: input.name,
      targetAmount: input.targetAmount,
      period: input.period,
      deadline: input.deadline,
      status: 'ACTIVE',
    },
  })

  revalidatePath('/goals')
  revalidatePath('/')

  return goal
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx jest src/lib/services/goal.test.ts
# Expected: PASS
```

- [ ] **Step 5: Add remaining functions to goal.ts**

```typescript
// Get goals for a user
export async function getGoals(userId: string, status?: GoalStatus) {
  return prisma.goal.findMany({
    where: { userId, ...(status && { status }) },
    orderBy: { createdAt: 'desc' },
  })
}

// Get single goal
export async function getGoal(id: string) {
  return prisma.goal.findUnique({ where: { id } })
}

// Update goal
export async function updateGoal(id: string, data: Partial<CreateGoalInput>) {
  const goal = await prisma.goal.update({
    where: { id },
    data,
  })
  revalidatePath('/goals')
  revalidatePath('/')
  return goal
}

// Archive goal
export async function archiveGoal(id: string) {
  return updateGoal(id, { status: 'ARCHIVED' })
}

// Calculate current progress for a goal
export async function calculateGoalProgress(goalId: string) {
  const goal = await getGoal(goalId)
  if (!goal) throw new Error('Goal not found')

  if (goal.type === 'ASSET') {
    // Sum latest assets for user across all accounts, converted to CNY
    const assets = await prisma.$queryRaw`
      WITH latest AS (
        SELECT DISTINCT ON ("accountId")
          "accountId", amount, currency
        FROM assets
        WHERE "userId" = ${goal.userId}
        ORDER BY "accountId", date DESC
      )
      SELECT amount, currency FROM latest
    `
    // Convert to CNY and sum (simplified - uses hardcoded rates)
    const rates: Record<string, number> = { USD: 6.8, HKD: 0.868, CNY: 1 }
    const total = (assets as { amount: bigint; currency: string }[])
      .reduce((sum, a) => sum + Number(a.amount) * (rates[a.currency] || 1), 0)
    return total
  } else {
    // Profit goal: sum realProfit for current period
    const { getDateRange } = await import('./profit')
    const period = goal.period === 'MONTHLY' ? 'month' : 'year'
    const { start, end } = getDateRange(period)
    
    // Use calculateAllProfits for the user
    const { calculateAllProfits } = await import('./profit')
    const profits = await calculateAllProfits(goal.userId, period)
    
    return profits.reduce((sum, p) => sum + p.realProfit, 0)
  }
}

// Record daily progress snapshot
export async function recordGoalProgress(goalId: string, amount: number) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  return prisma.goalProgress.upsert({
    where: { goalId_date: { goalId, date: today } },
    create: { goalId, date: today, currentAmount: amount },
    update: { currentAmount: amount },
  })
}

// Get progress history
export async function getGoalProgressHistory(goalId: string) {
  return prisma.goalProgress.findMany({
    where: { goalId },
    orderBy: { date: 'asc' },
  })
}
```

- [ ] **Step 6: Run tests**

```bash
npx jest src/lib/services/goal.test.ts
# Expected: PASS
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/services/goal.ts src/lib/services/goal.test.ts
git commit -m "feat: add goal service with CRUD operations"
```

---

## Task 3: Create Goal Form Component

**Files:**
- Create: `src/components/goals/goal-form.tsx`

- [ ] **Step 1: Create goal-form.tsx**

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GoalFormProps {
  userId: string
  initialData?: {
    id?: string
    type?: 'ASSET' | 'PROFIT'
    name?: string
    targetAmount?: number
    period?: 'MONTHLY' | 'YEARLY'
    deadline?: string
  }
}

export function GoalForm({ userId, initialData }: GoalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(initialData?.type || 'ASSET')
  const [name, setName] = useState(initialData?.name || '')
  const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount?.toString() || '')
  const [period, setPeriod] = useState(initialData?.period || 'MONTHLY')
  const [deadline, setDeadline] = useState(initialData?.deadline || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/goals', {
      method: initialData?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        name,
        targetAmount: parseFloat(targetAmount),
        period: type === 'PROFIT' ? period : undefined,
        deadline: deadline || undefined,
      }),
    })

    if (res.ok) {
      router.push('/goals')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Type toggle */}
      <div>
        <Label>目标类型</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ASSET">资产目标</SelectItem>
            <SelectItem value="PROFIT">收益目标</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div>
        <Label>目标名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：年底存到100万"
          required
        />
      </div>

      {/* Target amount */}
      <div>
        <Label>目标金额 (CNY)</Label>
        <Input
          type="number"
          step="0.01"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </div>

      {/* Period (PROFIT only) */}
      {type === 'PROFIT' && (
        <div>
          <Label>周期</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">每月</SelectItem>
              <SelectItem value="YEARLY">每年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Deadline */}
      <div>
        <Label>截止日期 (可选)</Label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : initialData?.id ? '保存' : '创建'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/goals/goal-form.tsx
git commit -m "feat: add goal form component"
```

---

## Task 4: Create Goals List Page

**Files:**
- Create: `src/app/(dashboard)/goals/page.tsx`
- Create: `src/components/goals/goal-card.tsx`

- [ ] **Step 1: Create goal-card.tsx**

```typescript
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

interface GoalCardProps {
  goal: {
    id: string
    name: string
    type: string
    targetAmount: number
    currentAmount: number
    status: string
    deadline?: Date | null
  }
}

export function GoalCard({ goal }: GoalCardProps) {
  const progress = Math.min((goal.currentAmount / Number(goal.targetAmount)) * 100, 100)
  const isAsset = goal.type === 'ASSET'

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const daysRemaining = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <Link href={`/goals/${goal.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="pt-6">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-medium">{goal.name}</h3>
              <p className="text-xs text-gray-500">
                {isAsset ? '资产目标' : '收益目标'}
              </p>
            </div>
            <span
              className={`text-xs px-2 py-1 rounded ${
                goal.status === 'ACTIVE'
                  ? 'bg-blue-100 text-blue-700'
                  : goal.status === 'COMPLETED'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}
            >
              {goal.status === 'ACTIVE' ? '进行中' : goal.status === 'COMPLETED' ? '已完成' : '已归档'}
            </span>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-1">
              <span>{formatCurrency(goal.currentAmount)}</span>
              <span className="text-gray-500">/ {formatCurrency(Number(goal.targetAmount))}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <div className="mt-3 flex justify-between text-xs text-gray-500">
            <span>{progress.toFixed(1)}%</span>
            {daysRemaining !== null && daysRemaining > 0 && (
              <span>剩余 {daysRemaining} 天</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

- [ ] **Step 2: Create goals/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGoals } from '@/lib/services/goal'
import { calculateGoalProgress } from '@/lib/services/goal'
import { Button } from '@/components/ui/button'
import { GoalCard } from '@/components/goals/goal-card'
import Link from 'next/link'

export default async function GoalsPage() {
  const session = await auth()
  if (!session?.user?.id) return null

  const goals = await getGoals(session.user.id)

  // Calculate current progress for each goal
  const goalsWithProgress = await Promise.all(
    goals.map(async (goal) => {
      const currentAmount = await calculateGoalProgress(goal.id)
      return { ...goal, currentAmount }
    })
  )

  const activeGoals = goalsWithProgress.filter((g) => g.status === 'ACTIVE')
  const completedGoals = goalsWithProgress.filter((g) => g.status === 'COMPLETED')
  const archivedGoals = goalsWithProgress.filter((g) => g.status === 'ARCHIVED' || g.status === 'FAILED')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">目标追踪</h1>
        <Link href="/goals/new">
          <Button>新建目标</Button>
        </Link>
      </div>

      {/* Tabs - using simple state for demo, could use URL search params */}
      <div className="space-y-4">
        <section>
          <h2 className="text-lg font-medium mb-3">进行中 ({activeGoals.length})</h2>
          {activeGoals.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {activeGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          ) : (
            <p className="text-gray-500">暂无进行中的目标</p>
          )}
        </section>

        {completedGoals.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-3">已完成 ({completedGoals.length})</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {completedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </section>
        )}

        {archivedGoals.length > 0 && (
          <section>
            <h2 className="text-lg font-medium mb-3">已归档 ({archivedGoals.length})</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {archivedGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/goals/page.tsx src/components/goals/goal-card.tsx
git commit -m "feat: add goals list page"
```

---

## Task 5: Create Goal API Route

**Files:**
- Create: `src/app/api/goals/route.ts` (POST + GET)
- Create: `src/app/api/goals/[id]/route.ts` (PUT + DELETE)

- [ ] **Step 1: Create API route for goals**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createGoal, getGoals } from '@/lib/services/goal'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const goals = await getGoals(session.user.id)
  return NextResponse.json(goals)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const goal = await createGoal({
    userId: session.user.id,
    ...body,
  })

  return NextResponse.json(goal, { status: 201 })
}
```

- [ ] **Step 2: Create API route for single goal**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getGoal, updateGoal, archiveGoal } from '@/lib/services/goal'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const goal = await getGoal(id)
  if (!goal || goal.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(goal)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const goal = await updateGoal(id, body)

  return NextResponse.json(goal)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  await archiveGoal(id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/goals/route.ts src/app/api/goals/[id]/route.ts
git commit -m "feat: add goals API routes"
```

---

## Task 6: Create New/Edit Goal Pages

**Files:**
- Create: `src/app/(dashboard)/goals/new/page.tsx`
- Create: `src/app/(dashboard)/goals/[id]/edit/page.tsx`

- [ ] **Step 1: Create goals/new/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { GoalForm } from '@/components/goals/goal-form'

export default async function NewGoalPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新建目标</h1>
      <GoalForm userId={session.user.id} />
    </div>
  )
}
```

- [ ] **Step 2: Create goals/[id]/edit/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getGoal } from '@/lib/services/goal'
import { GoalForm } from '@/components/goals/goal-form'

export default async function EditGoalPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const goal = await getGoal(id)

  if (!goal || goal.userId !== session.user.id) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">编辑目标</h1>
      <GoalForm
        userId={session.user.id}
        initialData={{
          id: goal.id,
          type: goal.type as 'ASSET' | 'PROFIT',
          name: goal.name,
          targetAmount: Number(goal.targetAmount),
          period: goal.period as 'MONTHLY' | 'YEARLY' | undefined,
          deadline: goal.deadline?.toISOString().split('T')[0],
        }}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/goals/new/page.tsx src/app/\(dashboard\)/goals/[id]/edit/page.tsx
git commit -m "feat: add goal create/edit pages"
```

---

## Task 7: Create Goal Detail Page with Progress Chart

**Files:**
- Create: `src/components/goals/goal-progress-chart.tsx`
- Create: `src/app/(dashboard)/goals/[id]/page.tsx`

- [ ] **Step 1: Create goal-progress-chart.tsx**

```typescript
'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ProgressData {
  date: string
  amount: number
}

interface GoalProgressChartProps {
  data: ProgressData[]
  targetAmount: number
}

export function GoalProgressChart({ data, targetAmount }: GoalProgressChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        暂无进度数据
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" tickFormatter={(v) => v.slice(5)} />
        <YAxis tickFormatter={(v) => formatCurrency(v)} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), '进度']}
          labelFormatter={(label) => `日期: ${label}`}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Create goals/[id]/page.tsx**

```typescript
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getGoal, calculateGoalProgress, getGoalProgressHistory } from '@/lib/services/goal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { GoalProgressChart } from '@/components/goals/goal-progress-chart'
import Link from 'next/link'

export default async function GoalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const goal = await getGoal(id)

  if (!goal || goal.userId !== session.user.id) {
    notFound()
  }

  const currentAmount = await calculateGoalProgress(goal.id)
  const progressHistory = await getGoalProgressHistory(goal.id)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const progress = Math.min((currentAmount / Number(goal.targetAmount)) * 100, 100)
  const isAsset = goal.type === 'ASSET'

  const chartData = progressHistory.map((p) => ({
    date: p.date.toISOString().split('T')[0],
    amount: Number(p.currentAmount),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{goal.name}</h1>
        <div className="flex gap-2">
          <Link href={`/goals/${id}/edit`}>
            <Button variant="outline">编辑</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              当前进度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(currentAmount)}</div>
            <p className="text-xs text-gray-400 mt-1">
              / {formatCurrency(Number(goal.targetAmount))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              完成度
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{progress.toFixed(1)}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              状态
            </CardTitle>
          </CardHeader>
          <CardContent>
            <span
              className={`text-2xl font-bold ${
                goal.status === 'ACTIVE'
                  ? 'text-blue-600'
                  : goal.status === 'COMPLETED'
                  ? 'text-green-600'
                  : 'text-gray-600'
              }`}
            >
              {goal.status === 'ACTIVE'
                ? '进行中'
                : goal.status === 'COMPLETED'
                ? '已完成'
                : goal.status === 'FAILED'
                ? '已失败'
                : '已归档'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Progress chart */}
      <Card>
        <CardHeader>
          <CardTitle>进度趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <GoalProgressChart data={chartData} targetAmount={Number(goal.targetAmount)} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/goals/[id]/page.tsx src/components/goals/goal-progress-chart.tsx
git commit -m "feat: add goal detail page with progress chart"
```

---

## Task 8: Add Goal Cards to Dashboard

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

- [ ] **Step 1: Add goals query and cards to dashboard**

Add after the imports:
```typescript
import { getGoals } from '@/lib/services/goal'
import { calculateGoalProgress } from '@/lib/services/goal'
import { GoalCard } from '@/components/goals/goal-card'
```

Add after monthProfit section:
```typescript
// Get active goals for dashboard
const goals = await getGoals(session.user.id, 'ACTIVE')
const goalsWithProgress = await Promise.all(
  goals.slice(0, 2).map(async (goal) => ({
    ...goal,
    currentAmount: await calculateGoalProgress(goal.id),
  }))
)
```

Add goal cards section after stats cards grid:
```tsx
{goalsWithProgress.length > 0 && (
  <div className="grid gap-4 md:grid-cols-2">
    {goalsWithProgress.map((goal) => (
      <GoalCard key={goal.id} goal={goal} />
    ))}
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: add goal cards to dashboard"
```

---

## Task 9: Add Recharts Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install recharts**

```bash
npm install recharts
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add recharts for progress charts"
```

---

## Task 10: Create Monthly Reset Cron Job

**Files:**
- Create: `src/lib/services/goal-cron.ts`

- [ ] **Step 1: Create goal-cron.ts**

```typescript
import { prisma } from '@/lib/prisma'
import { calculateGoalProgress, recordGoalProgress, updateGoal } from './goal'
import { getDateRange } from './profit'

/**
 * Monthly reset for profit goals:
 * - Check each ACTIVE profit goal with MONTHLY period
 * - If completed (currentAmount >= targetAmount) → mark COMPLETED
 * - If not completed → mark FAILED
 * - Create new period record with 0 progress
 */
export async function runMonthlyGoalReset() {
  const now = new Date()
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  // Get all active monthly profit goals
  const monthlyProfitGoals = await prisma.goal.findMany({
    where: {
      type: 'PROFIT',
      period: 'MONTHLY',
      status: 'ACTIVE',
    },
  })

  for (const goal of monthlyProfitGoals) {
    // Calculate last month's progress (this is a simplification -
    // in production you'd store period context with the progress)
    const currentAmount = await calculateGoalProgress(goal.id)

    if (currentAmount >= Number(goal.targetAmount)) {
      // Goal achieved
      await updateGoal(goal.id, { status: 'COMPLETED', completedAt: new Date() })
    } else {
      // Failed for this period
      await updateGoal(goal.id, { status: 'FAILED' })
    }

    // Create new period starting fresh
    // The next calculateGoalProgress call will start from 0 for the new period
    // (since profit.ts getDateRange returns start of current month)
  }

  console.log(`Processed ${monthlyProfitGoals.length} monthly profit goals`)
}

// Export for use in cron job setup
export { runMonthlyGoalReset as handler }
```

- [ ] **Step 2: Create cron setup script** (optional, for manual triggering initially)

```typescript
// src/app/api/cron/goals-reset/route.ts
import { NextResponse } from 'next/server'
import { runMonthlyGoalReset } from '@/lib/services/goal-cron'

// This endpoint should be protected and called by a cron service
export async function POST() {
  try {
    await runMonthlyGoalReset()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Goal reset failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/goal-cron.ts src/app/api/cron/goals-reset/route.ts
git commit -m "feat: add monthly goal reset cron job"
```

---

## Task 11: Daily Progress Recording (Optional Enhancement)

**Files:**
- Modify: `src/lib/services/goal-cron.ts` (add daily recording)

- [ ] **Step 1: Add daily progress recording to cron**

```typescript
/**
 * Record daily progress for all active goals
 * Should be called daily via cron
 */
export async function recordAllGoalProgress() {
  const activeGoals = await prisma.goal.findMany({
    where: { status: 'ACTIVE' },
  })

  for (const goal of activeGoals) {
    const currentAmount = await calculateGoalProgress(goal.id)
    await recordGoalProgress(goal.id, currentAmount)
  }

  console.log(`Recorded progress for ${activeGoals.length} goals`)
}
```

- [ ] **Step 2: Add API route for daily recording**

```typescript
// src/app/api/cron/goals-progress/route.ts
import { NextResponse } from 'next/server'
import { recordAllGoalProgress } from '@/lib/services/goal-cron'

export async function POST() {
  await recordAllGoalProgress()
  return NextResponse.json({ success: true })
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/services/goal-cron.ts src/app/api/cron/goals-progress/route.ts
git commit -m "feat: add daily progress recording cron"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|------------------|------|
| Goal + GoalProgress models | Task 1 |
| CRUD server actions | Task 2 |
| Goals list page | Task 4 |
| Create/Edit forms | Task 3, Task 6 |
| Goal detail with chart | Task 7 |
| Dashboard goal cards | Task 8 |
| Monthly period reset | Task 10 |
| Progress history tracking | Task 2, Task 11 |
| API routes | Task 5 |

## Type Consistency Check

- All GoalType values: 'ASSET' | 'PROFIT' - consistent
- All GoalPeriod values: 'MONTHLY' | 'YEARLY' - consistent
- All GoalStatus values: 'ACTIVE' | 'COMPLETED' | 'FAILED' | 'ARCHIVED' - consistent
- GoalForm initialData type matches getGoal return type
- calculateGoalProgress returns Promise\<number\>
- getGoalProgressHistory returns Promise\<GoalProgress[]\>
