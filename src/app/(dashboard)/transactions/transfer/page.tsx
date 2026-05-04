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