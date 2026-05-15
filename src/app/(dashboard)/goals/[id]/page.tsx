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