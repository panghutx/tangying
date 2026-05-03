# Supabase 集成实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将项目从本地 PostgreSQL 迁移到 Supabase，实现无本地数据库依赖的云端方案。

**Architecture:**
- 使用 Supabase PostgreSQL 作为托管数据库
- 使用 Supabase Auth 或保留 NextAuth.js 进行认证
- 使用 Prisma 连接 Supabase PostgreSQL
- 本地开发无需安装任何数据库

**Tech Stack:** Next.js 16, Prisma 7, Supabase PostgreSQL, NextAuth.js v5

---

## 文件结构

**修改文件:**
- `prisma/schema.prisma` - 更新数据库连接配置
- `src/lib/prisma.ts` - 更新 Prisma 客户端配置
- `src/lib/auth.ts` - 可能需要调整认证配置
- `.env.local` - 更新环境变量模板
- `package.json` - 可能需要调整依赖

**创建文件:**
- `SUPABASE_SETUP.md` - Supabase 设置指南

---

### Task 1: 更新 Prisma 配置支持 Supabase

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/prisma.ts`

- [ ] **Step 1: 更新 prisma/schema.prisma**

Supabase 使用标准的 PostgreSQL，Prisma 7 需要使用 adapter 模式。更新 datasource 配置：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  directUrl = env("DIRECT_URL")
}
```

注意：Supabase 提供两种连接方式：
- `DATABASE_URL` - 通过 Supabase Pooler（适合 serverless，连接池模式）
- `DIRECT_URL` - 直连模式（适合 Prisma migrate）

- [ ] **Step 2: 更新 src/lib/prisma.ts**

Prisma 7 使用 adapter 模式。对于 Supabase，使用 `@prisma/adapter-pg`：

```typescript
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Supabase connection pooling via DATABASE_URL
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
})

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 3: 创建 prisma.config.ts**

Prisma 7 需要配置文件：

```typescript
import { defineConfig } from '@prisma/client/config'

export default defineConfig({})
```

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma src/lib/prisma.ts prisma.config.ts
git commit -m "chore: configure Prisma for Supabase connection"
```

---

### Task 2: 创建 Supabase 设置指南

**Files:**
- Create: `SUPABASE_SETUP.md`

- [ ] **Step 1: 创建设置指南文档**

```markdown
# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 https://supabase.com 并登录
2. 点击 "New Project" 创建新项目
3. 填写项目名称和数据库密码
4. 选择离你最近的区域
5. 等待项目创建完成（约 2 分钟）

## 2. 获取数据库连接字符串

1. 进入项目后，点击左侧 "Project Settings"（齿轮图标）
2. 点击 "Database"
3. 在 "Connection string" 部分：
   - 选择 "URI" 格式
   - 复制 "Connection string"（这是 DIRECT_URL）
   - 复制 "Connection string (Pooler)"（这是 DATABASE_URL）

4. 连接字符串格式：
   ```
   # 直连模式（用于 Prisma migrate）
   DIRECT_URL="postgresql://postgres.[项目ID]:[密码]@aws-0-[区域].pooler.supabase.com:5432/postgres"

   # 连接池模式（用于应用运行时）
   DATABASE_URL="postgresql://postgres.[项目ID]:[密码]@aws-0-[区域].pooler.supabase.com:6543/postgres?pgbouncer=true"
   ```

## 3. 配置环境变量

创建 `.env.local` 文件：

```env
# Supabase 数据库连接
DATABASE_URL="你的连接池URL"
DIRECT_URL="你的直连URL"

# NextAuth 配置
AUTH_SECRET="随机生成的密钥（可用 openssl rand -base64 32 生成）"
NEXTAUTH_URL="http://localhost:3000"
```

## 4. 初始化数据库

```bash
npx prisma db push
```

## 5. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 开始使用！

## 注意事项

- Supabase 免费套餐包含 500MB 数据库存储
- 连接池模式（端口 6543）适合 serverless 环境
- 直连模式（端口 5432）适合数据库迁移操作
```

- [ ] **Step 2: Commit**

```bash
git add SUPABASE_SETUP.md
git commit -m "docs: add Supabase setup guide"
```

---

### Task 3: 更新环境变量模板

**Files:**
- Create: `.env.example`

- [ ] **Step 1: 创建环境变量示例文件**

```env
# Supabase 数据库连接
# 从 Supabase Dashboard > Project Settings > Database 获取

# 连接池模式 URL（用于应用运行时）
DATABASE_URL="postgresql://postgres.[项目ID]:[密码]@aws-0-[区域].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 直连模式 URL（用于 Prisma migrate）
DIRECT_URL="postgresql://postgres.[项目ID]:[密码]@aws-0-[区域].pooler.supabase.com:5432/postgres"

# NextAuth 配置
# 运行 openssl rand -base64 32 生成
AUTH_SECRET="your-secret-key-here"

# 应用 URL
NEXTAUTH_URL="http://localhost:3000"
```

- [ ] **Step 2: Commit**

```bash
git add .env.example
git commit -m "chore: add environment variables template for Supabase"
```

---

### Task 4: 最终验证

**Files:**
- 无文件修改

- [ ] **Step 1: 运行 lint 检查**

```bash
npm run lint
```

- [ ] **Step 2: 运行 build 检查**

```bash
npm run build
```

- [ ] **Step 3: 创建最终 commit**

```bash
git add -A
git commit -m "feat: complete Supabase integration"
```
