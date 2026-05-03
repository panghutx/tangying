# Supabase 设置指南

本指南将帮助你在 Supabase 上设置 PostgreSQL 数据库，用于 Finance Aggregator 应用。

## 为什么选择 Supabase？

- 免费套餐 generous，适合开发和小型项目
- 自动备份和高可用性
- 内置连接池（pgbouncer），适合 Serverless 环境
- 无需本地安装和维护 PostgreSQL

---

## 第一步：创建 Supabase 项目

1. 访问 [Supabase 官网](https://supabase.com)
2. 点击 "Start your project" 或 "Sign Up"
3. 使用 GitHub 账号登录（推荐）或邮箱注册
4. 登录后，点击 "New Project"
5. 填写项目信息：
   - **Organization**: 选择或创建组织
   - **Project name**: `finance-aggregator`（或你喜欢的名称）
   - **Database password**: 设置一个强密码（请保存好！）
   - **Region**: 选择离你最近的区域，推荐 `Northeast Asia (Tokyo)` 或 `Southeast Asia (Singapore)`
6. 点击 "Create new project"
7. 等待项目创建完成（通常需要 1-2 分钟）

---

## 第二步：获取数据库连接字符串

项目创建完成后，按以下步骤获取连接信息：

1. 在 Supabase Dashboard 中，进入你的项目
2. 点击左侧菜单的 **Project Settings**（齿轮图标）
3. 点击 **Database** 选项卡
4. 在 **Connection string** 部分，找到 **URI** 格式

### 2.1 获取 DATABASE_URL（连接池模式）

连接池模式适合 Serverless 环境（如 Vercel）和开发环境：

```
postgresql://[user]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
```

**关键点：**
- 端口：`6543`（连接池端口）
- 必须添加 `?pgbouncer=true` 参数
- 域名包含 `.pooler.supabase.com`

### 2.2 获取 DIRECT_URL（直连模式）

直连模式用于 Prisma Migrate 和管理操作：

```
postgresql://[user]:[password]@db.[project-ref].supabase.co:5432/postgres
```

**关键点：**
- 端口：`5432`（标准 PostgreSQL 端口）
- 域名格式：`db.[project-ref].supabase.co`
- 无需额外参数

### 示例

假设你的项目信息如下：
- Project reference: `abcdefghijklmnop`
- Region: `ap-northeast-1`
- Database user: `postgres`
- Password: `your-password`

则连接字符串为：

```bash
# DATABASE_URL（连接池模式）
DATABASE_URL="postgresql://postgres:your-password@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL（直连模式）
DIRECT_URL="postgresql://postgres:your-password@db.abcdefghijklmnop.supabase.co:5432/postgres"
```

---

## 第三步：配置环境变量

1. 在项目根目录创建 `.env` 文件（如果不存在）

```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，填入以下内容：

```bash
# 数据库连接（连接池模式，用于应用运行时）
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@aws-0-YOUR_REGION.pooler.supabase.com:6543/postgres?pgbouncer=true"

# 数据库直连（用于 Prisma Migrate 和管理操作）
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres"

# NextAuth.js 密钥（用于加密 session）
AUTH_SECRET="用 openssl rand -base64 32 生成的随机字符串"

# 应用 URL（开发环境）
NEXTAUTH_URL="http://localhost:3000"
```

### 3.1 生成 AUTH_SECRET

运行以下命令生成安全的密钥：

```bash
openssl rand -base64 32
```

将输出结果复制到 `.env` 文件的 `AUTH_SECRET` 字段。

---

## 第四步：初始化数据库

配置好环境变量后，运行 Prisma 命令创建数据库表：

```bash
# 生成 Prisma Client
npx prisma generate

# 将 schema 推送到数据库（创建表）
npx prisma db push
```

如果一切正常，你会看到类似输出：

```
Your database is now in sync with your Prisma schema.
```

### 验证数据库

1. 回到 Supabase Dashboard
2. 点击左侧 **Table Editor**
3. 你应该看到以下表已创建：
   - `users` - 用户表
   - `financial_accounts` - 金融账户表
   - `assets` - 资产表
   - `incomes` - 收入表
   - `sync_logs` - 同步日志表

---

## 第五步：启动开发服务器

```bash
npm run dev
```

打开浏览器访问 http://localhost:3000

---

## 注意事项

### 连接字符串注意事项

1. **不要混淆端口**：
   - `6543` + `?pgbouncer=true` = 连接池模式（DATABASE_URL）
   - `5432` = 直连模式（DIRECT_URL）

2. **密码特殊字符**：如果密码包含特殊字符（如 `@`, `#`, `%` 等），需要进行 URL 编码：
   - `@` → `%40`
   - `#` → `%23`
   - `%` → `%25`
   - `&` → `%26`

3. **不要将 `.env` 文件提交到 Git**：
   - `.env` 已在 `.gitignore` 中，请确保不要移除
   - 生产环境请使用平台的环境变量功能

### Supabase 免费套餐限制

- 数据库大小：500 MB
- 并发连接：连接池模式无限制，直连最多 3 个
- 带宽：5 GB/月
- 存储：1 GB

对于个人开发和小型项目完全足够。

### 常见问题

#### Q: `prisma db push` 报错 "Can't reach database server"

检查：
1. DATABASE_URL 和 DIRECT_URL 是否正确
2. 密码是否包含特殊字符（需要编码）
3. 项目是否已完成创建（状态是否为 Active）

#### Q: 连接超时

可能原因：
1. Region 选择过远
2. 网络问题（尝试使用 VPN）
3. Supabase 服务暂时不可用（查看状态页）

#### Q: Prisma 报错 "P1001: Can't reach database server"

确保 DIRECT_URL 正确配置且使用端口 5432。Prisma Migrate 需要直连模式。

---

## 生产环境部署

部署到 Vercel/Netlify 时：

1. 在平台的环境变量设置中添加：
   - `DATABASE_URL`（连接池模式）
   - `DIRECT_URL`（直连模式）
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`（改为生产域名，如 `https://your-domain.com`）

2. Vercel 会自动运行 `prisma generate`，但首次部署前需要确保数据库已初始化（可在本地先运行 `prisma db push`）

---

## 参考资料

- [Supabase 官方文档](https://supabase.com/docs)
- [Prisma with Supabase](https://www.prisma.io/docs/guides/database/supabase)
- [NextAuth.js 文档](https://next-auth.js.org/)
