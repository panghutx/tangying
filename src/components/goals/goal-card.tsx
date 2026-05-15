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
