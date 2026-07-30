import { z } from "zod"

export const holdingSchema = z.object({
  accountId: z.string().min(1, "请选择账户"),
  symbol: z.string().min(1, "代码不能为空").transform((value) => value.trim().toUpperCase()),
  name: z.string().min(1, "名称不能为空"),
  market: z.enum(["US_STOCK", "US_ETF", "CN_FUND", "CN_ETF", "HK_STOCK", "CASH", "OTHER"]),
  bucket: z.enum([
    "CASH",
    "SP500_GLOBAL",
    "NASDAQ_TECH",
    "ACTIVE_TECH_AI",
    "CHINA_INTERNET",
    "CN_HK_EQUITY",
    "GOLD_RESOURCE",
    "BOND_INCOME",
    "OTHER",
  ]),
  currency: z.string().min(1, "币种不能为空").transform((value) => value.trim().toUpperCase()),
  quantity: z.number().positive("数量必须大于 0"),
  costAmount: z.number().min(0, "成本不能为负数"),
  costCurrency: z.string().min(1, "成本币种不能为空").transform((value) => value.trim().toUpperCase()),
  note: z.string().optional(),
})

export const updateHoldingSchema = holdingSchema.partial()

export type HoldingInput = z.infer<typeof holdingSchema>
