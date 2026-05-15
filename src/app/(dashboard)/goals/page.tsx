import { auth } from '@/lib/auth'
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
