'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface GoalFormProps {
  userId: string
  initialData?: {
    id?: string
    type?: 'ASSET' | 'PROFIT'
    name?: string
    targetAmount?: number
    period?: 'MONTHLY' | 'YEARLY'
    deadline?: string
  }
}

export function GoalForm({ userId, initialData }: GoalFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState(initialData?.type || 'ASSET')
  const [name, setName] = useState(initialData?.name || '')
  const [targetAmount, setTargetAmount] = useState(initialData?.targetAmount?.toString() || '')
  const [period, setPeriod] = useState(initialData?.period || 'MONTHLY')
  const [deadline, setDeadline] = useState(initialData?.deadline || '')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch('/api/goals', {
      method: initialData?.id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        type,
        name,
        targetAmount: parseFloat(targetAmount),
        period: type === 'PROFIT' ? period : undefined,
        deadline: deadline || undefined,
      }),
    })

    if (res.ok) {
      router.push('/goals')
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Type toggle */}
      <div>
        <Label>目标类型</Label>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ASSET">资产目标</SelectItem>
            <SelectItem value="PROFIT">收益目标</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Name */}
      <div>
        <Label>目标名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如：年底存到100万"
          required
        />
      </div>

      {/* Target amount */}
      <div>
        <Label>目标金额 (CNY)</Label>
        <Input
          type="number"
          step="0.01"
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          required
        />
      </div>

      {/* Period (PROFIT only) */}
      {type === 'PROFIT' && (
        <div>
          <Label>周期</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MONTHLY">每月</SelectItem>
              <SelectItem value="YEARLY">每年</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Deadline */}
      <div>
        <Label>截止日期 (可选)</Label>
        <Input
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? '保存中...' : initialData?.id ? '保存' : '创建'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  )
}
