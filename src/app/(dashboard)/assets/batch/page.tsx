import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { BatchAssetForm } from "@/components/assets/batch-asset-form"

export default async function BatchAssetPage() {
  const session = await auth()
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session?.user?.id, isActive: true },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">批量记录资产</h1>
      <p className="text-gray-500">
        一次性记录所有账户的资产快照，方便每日/每周定期录入
      </p>
      <BatchAssetForm accounts={accounts} />
    </div>
  )
}