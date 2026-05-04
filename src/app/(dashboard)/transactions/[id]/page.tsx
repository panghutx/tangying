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