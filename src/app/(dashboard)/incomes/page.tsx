import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { IncomeList } from "@/components/incomes/income-list"
import Link from "next/link"

export default async function IncomesPage() {
  const session = await auth()
  const incomes = await prisma.income.findMany({
    where: { userId: session?.user?.id },
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { name: true, platform: true, currency: true },
      },
    },
  })

  // 将 Decimal 转换为普通数字
  const serializedIncomes = incomes.map((income) => ({
    ...income,
    amount: Number(income.amount),
    date: income.date.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">收益记录</h1>
        <Link href="/incomes/new">
          <Button>新增记录</Button>
        </Link>
      </div>

      <IncomeList incomes={serializedIncomes} />
    </div>
  )
}
