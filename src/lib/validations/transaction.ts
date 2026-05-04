import { z } from "zod"

export const transactionSchema = z.object({
  accountId: z.string().min(1, "请选择账户"),
  date: z.string().min(1, "请选择日期"),
  amount: z.number().positive("金额必须大于0"),
  type: z.enum(["INCOME", "DEPOSIT", "WITHDRAW", "TRANSFER_IN", "TRANSFER_OUT"]),
  category: z.string().optional(),
  note: z.string().optional(),
  relatedAccountId: z.string().optional(),
})

export const updateTransactionSchema = transactionSchema.partial()

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, "请选择转出账户"),
  toAccountId: z.string().min(1, "请选择转入账户"),
  fromAmount: z.number().positive("转出金额必须大于0"),
  toAmount: z.number().positive("转入金额必须大于0"),
  date: z.string().min(1, "请选择日期"),
  note: z.string().optional(),
}).refine((data) => data.fromAccountId !== data.toAccountId, {
  message: "转出账户和转入账户不能相同",
  path: ["toAccountId"],
})

export type TransactionInput = z.infer<typeof transactionSchema>
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>
export type TransferInput = z.infer<typeof transferSchema>
