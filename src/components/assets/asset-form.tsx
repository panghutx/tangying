"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { assetSchema, AssetInput } from "@/lib/validations/asset"
import { getSupportedCurrencies } from "@/lib/services/exchange-rate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Account {
  id: string
  name: string
  platform: string
}

interface AssetFormProps {
  initialData?: {
    id: string
    accountId: string
    date: string
    amount: number
    currency: string
    note?: string
  }
  accounts: Account[]
}

const currencies = getSupportedCurrencies()

export function AssetForm({ initialData, accounts }: AssetFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AssetInput>({
    resolver: zodResolver(assetSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          date: initialData.date.split("T")[0],
        }
      : {
          date: new Date().toISOString().split("T")[0],
          currency: "CNY",
          accountId: accounts[0]?.id || "",
        },
  })

  const accountId = watch("accountId")
  const currency = watch("currency")

  const onSubmit = async (data: AssetInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = initialData ? `/api/assets/${initialData.id}` : "/api/assets"
      const method = initialData ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const res = await response.json()
        setError(res.error || "操作失败")
        return
      }

      router.push("/assets")
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
            后再添加资产记录
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{initialData ? "编辑资产记录" : "新增资产记录"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="accountId">账户</Label>
            <Select
              value={accountId}
              onValueChange={(value) => setValue("accountId", value as string)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择账户">
                  {(value: string | null) => {
                    if (!value) return "选择账户"
                    const account = accounts.find(a => a.id === value)
                    return account ? `${account.name} (${account.platform})` : value
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} ({account.platform})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.accountId && (
              <p className="text-sm text-red-500">{errors.accountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">金额</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                {...register("amount", { valueAsNumber: true })}
                placeholder="资产总额"
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">币种</Label>
              <Select
                value={currency}
                onValueChange={(value) => setValue("currency", value as string)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择币种" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.name} ({c.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.currency && (
                <p className="text-sm text-red-500">{errors.currency.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">备注</Label>
            <Input id="note" {...register("note")} placeholder="可选备注" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "保存中..." : "保存"}
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