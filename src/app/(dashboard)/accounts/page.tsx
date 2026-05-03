import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { AccountList } from "@/components/accounts/account-list"
import Link from "next/link"

export default async function AccountsPage() {
  const session = await auth()
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session?.user?.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { assets: true, incomes: true },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">账户管理</h1>
        <Link href="/accounts/new">
          <Button>新建账户</Button>
        </Link>
      </div>

      <AccountList accounts={accounts} />
    </div>
  )
}
