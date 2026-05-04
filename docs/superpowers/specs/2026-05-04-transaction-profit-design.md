# Transaction 模型与收益计算设计

## 背景

当前系统存在的问题：
1. Income 表需要手动维护收益记录，容易遗漏
2. 资产变动无法区分「收益」与「资金转入/转出」
3. 无法准确计算每个账户的真实收益率

## 目标

- 自动计算每个账户的真实收益（资产变动 - 净流入）
- 支持记录账户间的资金转账
- 提供多时间维度的收益统计（本日/周/月、今年以来、累计、自定义）

## 数据模型

### 新增 Transaction 表

```prisma
enum TransactionType {
  INCOME       // 收益入账（利息、分红等自动入账）
  DEPOSIT      // 资金存入（主动转入）
  WITHDRAW     // 资金取出（主动转出）
  TRANSFER_IN  // 转账转入
  TRANSFER_OUT // 转账转出
}

model Transaction {
  id               String           @id @default(cuid())
  accountId        String
  userId           String
  date             DateTime         @db.Date
  amount           Decimal          @db.Decimal(15, 2)
  type             TransactionType
  category         String?          // 细分类：利息、分红、工资等
  note             String?
  relatedAccountId String?          // 转账关联的对方账户
  createdAt        DateTime         @default(now())

  account          FinancialAccount @relation(fields: [accountId], references: [id], onDelete: Cascade)
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([accountId, date])
  @@index([userId, date])
  @@map("transactions")
}
```

### 保留 Income 表

用于手动记录收益明细（PROFIT、DIVIDEND、INTEREST、FEE），与 Transaction 互补。

### 更新 User 和 FinancialAccount 模型

添加 `transactions` 关联。

## 收益计算逻辑

### 核心公式

```
真实收益 = 期末资产 - 期初资产 - 净流入
净流入 = (DEPOSIT + TRANSFER_IN) - (WITHDRAW + TRANSFER_OUT)
```

**注意**：`INCOME` 类型不计入净流入，因为它本身就是收益的一部分。

### 计算流程

1. 获取期初资产：查询指定账户在开始日期或之前最近的 Asset 记录
2. 获取期末资产：查询指定账户在结束日期或之前最近的 Asset 记录
3. 计算期间净流入：汇总该时间段内的 Transaction 记录
4. 计算真实收益：资产变动 - 净流入

### 收益率计算

```
收益率 = 真实收益 / 期初资产 × 100%
```

对于期初资产为 0 的情况，使用期间平均资产作为分母。

## API 设计

### Transaction CRUD

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/transactions` | GET | 获取流水列表，支持 `accountId`、`type`、`startDate`、`endDate` 筛选 |
| `/api/transactions` | POST | 创建流水记录 |
| `/api/transactions/[id]` | PUT | 更新流水记录 |
| `/api/transactions/[id]` | DELETE | 删除流水记录 |

### 转账 API

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/transactions/transfer` | POST | 创建转账，自动创建双向记录 |

请求体：
```json
{
  "fromAccountId": "账户A",
  "toAccountId": "账户B",
  "amount": 1000,
  "date": "2026-05-04",
  "note": "转入股市"
}
```

自动创建：
- 账户A: `TRANSFER_OUT` 记录
- 账户B: `TRANSFER_IN` 记录，`relatedAccountId` 指向账户A

### 收益统计 API

| 接口 | 方法 | 功能 |
|------|------|------|
| `/api/accounts/[id]/profit` | GET | 获取单个账户收益统计 |
| `/api/profits/summary` | GET | 获取所有账户收益汇总 |

查询参数：
- `period`: `today` | `week` | `month` | `year` | `all` | `custom`
- `startDate`: 自定义开始日期
- `endDate`: 自定义结束日期

返回结构：
```typescript
interface AccountProfit {
  accountId: string
  accountName: string
  currency: string

  startDate: Date
  endDate: Date

  startAsset: number
  endAsset: number
  assetChange: number

  totalDeposit: number
  totalWithdraw: number
  totalTransferIn: number
  totalTransferOut: number
  netInflow: number

  realProfit: number
  profitRate: number

  // 可选：Income 表汇总
  manualIncome?: number
}
```

## UI 设计

### Dashboard 改动

1. **账户列表增强**：每个账户显示「本月收益」和「累计收益」
2. **新增收益卡片**：显示总收益统计（本月/今年以来/累计）
3. **快捷入口**：新增「记一笔」按钮，快速记录存入/取出/转账

### 新增页面

1. **`/transactions`** - 流水记录页面
   - 流水列表（支持筛选）
   - 新增/编辑/删除流水
   - 转账功能

2. **`/reports`** - 收益报表页面
   - 时间范围选择器
   - 各账户收益明细表
   - 收益趋势图

### 组件设计

1. **`TransactionForm`** - 流水记录表单
2. **`TransferForm`** - 转账表单
3. **`TransactionList`** - 流水列表组件
4. **`ProfitCard`** - 收益统计卡片
5. **`ProfitTable`** - 收益明细表

## 实现步骤

1. 更新 Prisma Schema，添加 Transaction 模型
2. 运行数据库迁移
3. 创建 Transaction 验证 Schema
4. 实现 Transaction API（CRUD + 转账）
5. 实现收益计算服务
6. 实现收益统计 API
7. 创建 Transaction 相关组件
8. 更新 Dashboard 页面
9. 创建 Transactions 页面
10. 创建 Reports 页面

## 测试要点

1. 收益计算准确性：各种流水组合下的收益计算
2. 转账功能：双向记录的创建和关联
3. 边界情况：期初无资产、期间无流水等
4. 多币种：汇率换算对收益的影响
