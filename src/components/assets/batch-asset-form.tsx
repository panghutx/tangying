"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account {
  id: string
  name: string
  platform: string
  currency: string
}

interface BatchAssetFormProps {
  accounts: Account[]
  defaultDate?: string
}

const batchAssetSchema = z.object({
  date: z.string().min(1, "请选择日期"),
  assets: z.record(
    z.string(),
    z.object({
      amount: z.number().min(0, "金额不能为负数"),
      note: z.string().optional(),
    })
  ),
})

type BatchAssetInput = z.infer<typeof batchAssetSchema>

export function BatchAssetForm({ accounts, defaultDate }: BatchAssetFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = defaultDate || new Date().toISOString().split("T")[0]

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BatchAssetInput>({
    resolver: zodResolver(batchAssetSchema),
    defaultValues: {
      date: today,
      assets: accounts.reduce(
        (acc, account) => ({
          ...acc,
          [account.id]: { amount: 0, note: "" },
        }),
        {}
      ),
    },
  })

  const date = watch("date")

  const onSubmit = async (data: BatchAssetInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const promises = accounts.map((account) => {
        const assetData = data.assets[account.id]
        if (assetData && assetData.amount > 0) {
          return fetch("/api/assets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              accountId: account.id,
              date: data.date,
              amount: assetData.amount,
              currency: account.currency,
              note: assetData.note || null,
            }),
          })
        }
        return null
      })

      const results = await Promise.all(promises.filter(Boolean))
      const failed = results.filter((r) => r && !r.ok)

      if (failed.length > 0) {
        setError("部分记录保存失败，请重试")
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <p className="text-gray-500">
            请先{" "}
            <a href="/accounts/new" className="text-blue-500 hover:underline">
              创建账户
            </a>{" "}
            后再记录资产
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-3xl">
      <CardHeader>
        <CardTitle>批量记录资产快照</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* 日期选择 */}
          <div className="space-y-2">
            <Label htmlFor="date">记录日期</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* 各账户资产 */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-700">各账户资产金额</h3>
            <div className="grid gap-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-4 p-3 rounded-lg border"
                >
                  <div className="flex-1">
                    <Label className="font-medium">
                      {account.name}
                      <span className="text-gray-500 text-sm ml-2">
                        ({account.platform}) - {account.currency}
                      </span>
                    </Label>
                  </div>
                  <div className="w-32">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...register(`assets.${account.id}.amount`, {
                        valueAsNumber: true,
                      })}
                    />
                  </div>
                  <div className="w-48">
                    <Input
                      placeholder="备注"
                      {...register(`assets.${account.id}.note`)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          {/* 提交按钮 */}
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存全部"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}