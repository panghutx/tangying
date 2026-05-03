import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { IncomeForm } from "@/components/incomes/income-form"

export default async function EditIncomePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const [income, accounts] = await Promise.all([
    prisma.income.findFirst({
      where: {
        id,
        userId: session?.user?.id,
      },
    }),
    prisma.financialAccount.findMany({
      where: { userId: session?.user?.id, isActive: true },
      select: { id: true, name: true, platform: true },
      orderBy: { name: "asc" },
    }),
  ])

  if (!income) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">编辑收益记录</h1>
      <IncomeForm
        initialData={{
          id: income.id,
          accountId: income.accountId,
          date: income.date.toISOString(),
          amount: Number(income.amount),
          type: income.type,
          note: income.note,
        }}
        accounts={accounts}
      />
    </div>
  )
}