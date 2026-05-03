import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AssetForm } from "@/components/assets/asset-form"

export default async function NewAssetPage() {
  const session = await auth()
  const accounts = await prisma.financialAccount.findMany({
    where: { userId: session?.user?.id, isActive: true },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">新增资产记录</h1>
      <AssetForm accounts={accounts} />
    </div>
  )
}
