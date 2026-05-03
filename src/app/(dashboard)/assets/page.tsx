import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { AssetList } from "@/components/assets/asset-list"
import Link from "next/link"

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">资产记录</h1>
        <Link href="/assets/new">
          <Button>新增记录</Button>
        </Link>
      </div>

      <AssetList assets={assets} />
    </div>
  )
}
