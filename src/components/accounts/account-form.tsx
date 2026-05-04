"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { accountSchema, AccountInput } from "@/lib/validations/account"
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

const accountTypes = [
  { value: "DOMESTIC", label: "国内平台" },
  { value: "BANK", label: "银行理财" },
  { value: "BROKERAGE", label: "券商" },
  { value: "OVERSEAS", label: "海外平台" },
]

interface AccountFormProps {
  initialData?: {
    id: string
    name: string
    type: "DOMESTIC" | "BANK" | "BROKERAGE" | "OVERSEAS"
    platform: string
    currency: string
  }
}

export function AccountForm({ initialData }: AccountFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AccountInput>({
    resolver: zodResolver(accountSchema),
    defaultValues: initialData || {
      type: "DOMESTIC",
      currency: "CNY",
    },
  })

  const type = watch("type")

  const onSubmit = async (data: AccountInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const url = initialData
        ? `/api/accounts/${initialData.id}`
        : "/api/accounts"
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

      router.push("/accounts")
      router.refresh()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>{initialData ? "编辑账户" : "新建账户"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">账户名称</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="例如：支付宝基金"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">账户类型</Label>
            <Select
              value={type}
              onValueChange={(value) =>
                setValue("type", value as AccountInput["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="选择账户类型" />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-sm text-red-500">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="platform">平台名称</Label>
            <Input
              id="platform"
              {...register("platform")}
              placeholder="例如：支付宝、招商银行"
            />
            {errors.platform && (
              <p className="text-sm text-red-500">{errors.platform.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">币种</Label>
            <Input
              id="currency"
              {...register("currency")}
              placeholder="CNY"
            />
            {errors.currency && (
              <p className="text-sm text-red-500">{errors.currency.message}</p>
            )}
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
