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
