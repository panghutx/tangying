import { z } from "zod"

export const investmentTradeSchema = z.object({
  accountId: z.string().min(1, "请选择账户"),
  symbol: z.string().min(1, "代码不能为空").transform((value) => value.trim().toUpperCase()),
  name: z.string().min(1, "名称不能为空"),
  market: z.enum(["US_STOCK", "US_ETF", "CN_FUND", "CN_ETF", "HK_STOCK", "CASH", "OTHER"]),
  bucket: z.enum([
    "CASH", "SP500_GLOBAL", "NASDAQ_TECH", "ACTIVE_TECH_AI", "CHINA_INTERNET",
    "CN_HK_EQUITY", "GOLD_RESOURCE", "BOND_INCOME", "OTHER",
  ]),
  currency: z.string().min(1, "币种不能为空").transform((value) => value.trim().toUpperCase()),
  type: z.enum(["BUY", "SELL", "DIVIDEND", "FEE"]),
  tradedAt: z.coerce.date(),
  quantity: z.number().positive("数量必须大于 0"),
  price: z.number().positive("成交价必须大于 0"),
  fee: z.number().min(0, "手续费不能为负数").default(0),
  note: z.string().optional(),
})
