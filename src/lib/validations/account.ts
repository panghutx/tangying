import { z } from "zod"

export const accountSchema = z.object({
  name: z.string().min(1, "账户名称不能为空"),
  type: z.enum(["DOMESTIC", "BANK", "BROKERAGE", "OVERSEAS"]),
  platform: z.string().min(1, "平台名称不能为空"),
  currency: z.string().min(1, "币种不能为空"),
  cashBalance: z.number().min(0, "现金余额不能为负数").optional().nullable(),
  cashCurrency: z.string().optional().nullable(),
  includeInProfit: z.boolean().optional(),
  credentials: z.string().optional(),
})

export const updateAccountSchema = accountSchema.partial()

export type AccountInput = z.infer<typeof accountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
