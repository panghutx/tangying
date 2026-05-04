import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { TransactionList } from "@/components/transactions/transaction-list"
import Link from "next/link"

interface TransactionWithAccount {
  id: string
  accountId: string
  userId: string
  date: Date
  amount: { toNumber: () => number }
  type: "INCOME" | "DEPOSIT" | "WITHDRAW" | "TRANSFER_IN" | "TRANSFER_OUT"
  category: string | null
  note: string | null
  relatedAccountId: string | null
  account: {
    name: string
    platform: string
    currency: string
  }
}

export default async function TransactionsPage() {
  const session = await auth()
  const transactions = await prisma.transaction.findMany({
    where: { userId: session?.user?.id },
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { name: true, platform: true, currency: true },
      },
    },
  })

  const serializedTransactions = (transactions as TransactionWithAccount[]).map((t) => ({
    ...t,
    amount: t.amount.toNumber(),
    date: t.date.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">流水记录</h1>
        <div className="flex gap-2">
          <Link href="/transactions/transfer">
            <Button variant="outline">账户转账</Button>
          </Link>
          <Link href="/transactions/new">
            <Button>新增流水</Button>
          </Link>
        </div>
      </div>

      <TransactionList transactions={serializedTransactions} />
    </div>
  )
}