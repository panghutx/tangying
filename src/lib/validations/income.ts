import { z } from "zod"

export const incomeSchema = z.object({
  accountId: z.string().min(1, "请选择账户"),
  date: z.string().min(1, "请选择日期"),
  amount: z.number(),
  type: z.enum(["PROFIT", "DIVIDEND", "INTEREST", "FEE"]),
  note: z.string().optional(),
})

export const updateIncomeSchema = incomeSchema.partial()

export type IncomeInput = z.infer<typeof incomeSchema>
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>
