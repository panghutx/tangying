import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { AssetList } from "@/components/assets/asset-list"
import { GenerateAssetButton } from "@/components/assets/generate-asset-button"
import Link from "next/link"

interface AssetWithAccount {
  id: string
  accountId: string
  userId: string
  date: Date
  amount: { toNumber: () => number }
  currency: string
  note: string | null
  source: "MANUAL" | "AUTO_HOLDINGS" | "AUTO_MIXED"
  account: {
    name: string
    platform: string
  }
}

export default async function AssetsPage() {
  const session = await auth()
  const assets = await prisma.asset.findMany({
    where: { userId: session?.user?.id },
    orderBy: { date: "desc" },
    include: {
      account: {
        select: { name: true, platform: true },
      },
    },
  })

  // 将 Decimal 转换为普通数字
  const serializedAssets = (assets as AssetWithAccount[]).map((asset) => ({
    ...asset,
    amount: asset.amount.toNumber(),
    date: asset.date.toISOString(),
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">资产记录</h1>
        <div className="flex items-center gap-2">
          <GenerateAssetButton />
          <Link href="/assets/new">
            <Button variant="outline">新增记录</Button>
          </Link>
        </div>
      </div>

      <AssetList assets={serializedAssets} />
    </div>
  )
}
