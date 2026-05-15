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
