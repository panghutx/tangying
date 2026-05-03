import { z } from "zod"

export const assetSchema = z.object({
  accountId: z.string().min(1, "请选择账户"),
  date: z.string().min(1, "请选择日期"),
  amount: z.number().positive("金额必须大于0"),
  currency: z.string().min(1, "币种不能为空"),
  note: z.string().optional(),
})

export const updateAssetSchema = assetSchema.partial()

export type AssetInput = z.infer<typeof assetSchema>
export type UpdateAssetInput = z.infer<typeof updateAssetSchema>
