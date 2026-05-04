"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { transferSchema, TransferInput } from "@/lib/validations/transaction"
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

interface TransferFormProps {
  accounts: Account[]
}

export function TransferForm({ accounts }: TransferFormProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      fromAccountId: accounts[0]?.id || "",
      toAccountId: accounts[1]?.id || "",
    },
  })

  const fromAccountId = watch("fromAccountId")
  const toAccountId = watch("toAccountId")

  const onSubmit = async (data: TransferInput) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/transactions/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const res = await response.json()
        setError(res.error || "操作失败")
        return
      }

      router.push("/transactions")
      router.refresh()
    } catch {
      setError("网络错误，请稍后重试")
    } finally {
      setIsLoading(false)
    }
  }

  if (accounts.length < 2) {
    return (
      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <p className="text-gray-500">
            需要至少两个账户才能进行转账操作，请先{" "}
            <a href="/accounts/new" className="text-blue-500 hover:underline">
              创建账户
            </a>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>账户转账</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fromAccountId">转出账户</Label>
            <Select
              value={fromAccountId}
              onValueChange={(value) => value && setValue("fromAccountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择转出账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== toAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.fromAccountId && (
              <p className="text-sm text-red-500">{errors.fromAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="toAccountId">转入账户</Label>
            <Select
              value={toAccountId}
              onValueChange={(value) => value && setValue("toAccountId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择转入账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {errors.toAccountId && (
              <p className="text-sm text-red-500">{errors.toAccountId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">转账金额</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount", { valueAsNumber: true })}
              placeholder="请输入金额"
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">日期</Label>
            <Input id="date" type="date" {...register("date")} />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">备注</Label>
            <Input id="note" {...register("note")} placeholder="可选备注" />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "处理中..." : "确认转账"}
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
