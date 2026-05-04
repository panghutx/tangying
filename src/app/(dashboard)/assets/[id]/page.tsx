import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { AssetForm } from "@/components/assets/asset-form"

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const { id } = await params

  const asset = await prisma.asset.findFirst({
    where: {
      id,
      userId: session?.user?.id,
    },
  })

  if (!asset) {
    notFound()
  }

  const accounts = await prisma.financialAccount.findMany({
    where: {
      userId: session?.user?.id,
      OR: [{ isActive: true }, { id: asset.accountId }],
    },
    select: { id: true, name: true, platform: true },
    orderBy: { name: "asc" },
  })

  console.log("Asset:", JSON.stringify(asset, null, 2))
  console.log("Asset accountId:", asset.accountId)
  console.log("Accounts:", JSON.stringify(accounts, null, 2))
  console.log("Match found:", accounts.find(a => a.id === asset.accountId))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">编辑资产记录</h1>
      <AssetForm
        initialData={{
          id: asset.id,
          accountId: asset.accountId,
          date: asset.date.toISOString(),
          amount: Number(asset.amount),
          currency: asset.currency,
          note: asset.note || undefined,
        }}
        accounts={accounts}
      />
    </div>
  )
}