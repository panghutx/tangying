import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { IncomeForm } from "@/components/incomes/income-form"

export default async function NewIncomePage() {
  const session = await auth()
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session?.user?.id, isActive: true },
    select: { id: true, name: true, platform: true, currency: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新增收益记录</h1>
      <IncomeForm accounts={accounts} />
    </div>
  )
}
