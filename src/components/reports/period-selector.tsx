"use client"

import { useRouter } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PeriodType } from "@/lib/services/profit"

export function PeriodSelector({ defaultValue }: { defaultValue: PeriodType }) {
  const router = useRouter()

  return (
    <Select
      value={defaultValue}
      onValueChange={(v) => router.push(`/reports?period=${v}`)}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="week">本周</SelectItem>
        <SelectItem value="month">本月</SelectItem>
        <SelectItem value="year">今年</SelectItem>
        <SelectItem value="all">累计</SelectItem>
      </SelectContent>
    </Select>
  )
}
