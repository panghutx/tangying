import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound, redirect } from "next/navigation"
import { AccountForm } from "@/components/accounts/account-form"

export default async function EditAccountPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const account = await prisma.financialAccount.findFirst({
    where: {
      id,
      userId: session?.user?.id,
    },
  })

  if (!account) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">编辑账户</h1>
      <AccountForm
        initialData={{
          id: account.id,
          name: account.name,
          type: account.type,
          platform: account.platform,
          currency: account.currency,
          isActive: account.isActive,
        }}
      />
    </div>
  )
}
