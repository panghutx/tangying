# 移动端响应式适配实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为"躺盈记账"项目添加完整的移动端响应式支持，使应用在手机和平板设备上能够正常使用。

**Architecture:** 使用 React Context 管理侧边栏状态，shadcn/ui Sheet 组件实现抽屉式侧边栏，Tailwind CSS 响应式类名（md 断点 768px）区分移动端和桌面端布局。

**Tech Stack:** Next.js 16.2.4, React 19.2.4, Tailwind CSS v4, shadcn/ui, TypeScript

---

## 文件结构概览

### 需要新建的文件
- `src/contexts/sidebar-context.tsx` - 侧边栏状态管理 Context
- `src/components/ui/sheet.tsx` - Sheet 组件（通过 shadcn CLI 安装）

### 需要修改的文件
- `src/app/layout.tsx` - 添加 viewport metadata
- `src/app/(dashboard)/layout.tsx` - 添加 SidebarProvider，调整响应式类名
- `src/components/layout/sidebar.tsx` - 重构为响应式双模式
- `src/components/layout/header.tsx` - 添加汉堡菜单按钮
- `src/app/(dashboard)/page.tsx` - 表格添加横向滚动

---

## Task 1: 添加 Viewport Meta 标签

**Files:**
- Modify: `src/app/layout.tsx:16-19`

- [ ] **Step 1: 读取当前 layout.tsx 文件**

Run: 使用 Read 工具读取文件
Expected: 看到当前的 metadata 配置

- [ ] **Step 2: 添加 viewport 配置到 metadata**

在 `src/app/layout.tsx` 的 metadata 对象中添加 viewport 配置：

```typescript
export const metadata: Metadata = {
  title: "躺盈记账 - 个人资产收益追踪工具",
  description: "记录多账户资产、自动计算真实收益、支持多币种换算。告别手动算账，躺着也能看清财富增长。",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
}
```

- [ ] **Step 3: 验证修改**

Run: `npm run build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: add viewport meta tag for mobile support

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 2: 安装 shadcn/ui Sheet 组件

**Files:**
- Create: `src/components/ui/sheet.tsx`

- [ ] **Step 1: 安装 Sheet 组件**

Run: `npx shadcn@latest add sheet`
Expected: Sheet 组件安装到 `src/components/ui/sheet.tsx`

- [ ] **Step 2: 验证安装**

Run: 使用 Read 工具读取 `src/components/ui/sheet.tsx`
Expected: 文件存在且包含 Sheet, SheetContent, SheetHeader 等导出

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/sheet.tsx
git commit -m "feat: add shadcn/ui Sheet component

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 3: 创建 Sidebar Context

**Files:**
- Create: `src/contexts/sidebar-context.tsx`

- [ ] **Step 1: 创建 contexts 目录**

Run: `mkdir -p src/contexts`
Expected: 目录创建成功

- [ ] **Step 2: 创建 sidebar-context.tsx 文件**

创建 `src/contexts/sidebar-context.tsx`：

```typescript
"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface SidebarContextType {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <SidebarContext.Provider
      value={{
        isOpen,
        toggle: () => setIsOpen(prev => !prev),
        close: () => setIsOpen(false),
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/contexts/sidebar-context.tsx
git commit -m "feat: add sidebar context for mobile menu state

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 4: 重构 Sidebar 组件为响应式双模式

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

- [ ] **Step 1: 读取当前 Sidebar 组件**

Run: 使用 Read 工具读取 `src/components/layout/sidebar.tsx`
Expected: 看到当前的 Sidebar 实现

- [ ] **Step 2: 重构 Sidebar 组件**

完全替换 `src/components/layout/sidebar.tsx` 的内容：

```typescript
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PlusCircle } from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet"

const items = [
  { href: "/", label: "仪表盘" },
  { href: "/assets/batch", label: "快速记账", icon: PlusCircle },
  { href: "/accounts", label: "账户管理" },
  { href: "/assets", label: "资产记录" },
  { href: "/transactions", label: "流水记录" },
  { href: "/incomes", label: "收益记录" },
  { href: "/reports", label: "收益报表" },
]

function SidebarContent() {
  const pathname = usePathname()
  const { close } = useSidebar()

  return (
    <div>
      <div className="mb-8 px-6">
        <h1 className="text-xl font-bold text-gray-800">躺盈记账</h1>
        <p className="text-xs text-gray-400 mt-1">躺着也能看清财富增长</p>
      </div>
      <nav className="space-y-1 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

function DesktopSidebar() {
  return (
    <aside className="hidden md:block fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white pt-4">
      <SidebarContent />
    </aside>
  )
}

function MobileSidebar() {
  const { isOpen, close } = useSidebar()

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent side="left" className="w-64 p-0">
        <div className="pt-4">
          <SidebarContent />
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "refactor: make sidebar responsive with desktop and mobile modes

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 5: 增强 Header 组件添加汉堡菜单

**Files:**
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: 读取当前 Header 组件**

Run: 使用 Read 工具读取 `src/components/layout/header.tsx`
Expected: 看到当前的 Header 实现

- [ ] **Step 2: 修改 Header 组件添加汉堡菜单**

完全替换 `src/components/layout/header.tsx` 的内容：

```typescript
"use client"

import { NavUser } from "./nav-user"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/contexts/sidebar-context"

export function Header() {
  const { toggle } = useSidebar()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-6">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggle}
        aria-label="打开菜单"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden md:block" />

      <NavUser />
    </header>
  )
}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "feat: add hamburger menu button to header for mobile

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 6: 调整 Dashboard Layout 添加 Context Provider

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`

- [ ] **Step 1: 读取当前 Dashboard Layout**

Run: 使用 Read 工具读取 `src/app/(dashboard)/layout.tsx`
Expected: 看到当前的布局实现

- [ ] **Step 2: 修改 Dashboard Layout**

完全替换 `src/app/(dashboard)/layout.tsx` 的内容：

```typescript
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { SidebarProvider } from "@/contexts/sidebar-context"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen">
        <Sidebar />
        <div className="md:ml-64">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/layout.tsx
git commit -m "feat: add SidebarProvider and responsive margin to dashboard layout

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 7: 为主页表格添加横向滚动

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:384-438`

- [ ] **Step 1: 读取主页文件**

Run: 使用 Read 工具读取 `src/app/(dashboard)/page.tsx`
Expected: 看到账户列表表格的代码

- [ ] **Step 2: 在表格外层添加滚动容器**

找到账户列表表格部分（大约在第 384 行），将：

```typescript
            <div className="rounded-lg border">
              <table className="w-full">
```

修改为：

```typescript
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[600px]">
```

- [ ] **Step 3: 验证构建**

Run: `npm run build`
Expected: 构建成功，无 TypeScript 错误

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: add horizontal scroll to account table for mobile

Co-Authored-By: Claude Sonnet 4 <noreply@anthropic.com>"
```

---

## Task 8: 测试移动端响应式功能

**Files:**
- Test: 所有修改的文件

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev`
Expected: 开发服务器在 http://localhost:3000 启动

- [ ] **Step 2: 测试桌面端布局（>= 768px）**

在浏览器中打开 http://localhost:3000，调整窗口宽度 >= 768px
验证：
- 侧边栏固定显示在左侧
- 汉堡菜单按钮隐藏
- 内容区域有左边距
- 表格正常显示

- [ ] **Step 3: 测试移动端布局（< 768px）**

调整浏览器窗口宽度 < 768px
验证：
- 侧边栏隐藏
- 汉堡菜单按钮显示
- 内容区域占满全宽
- 表格可以横向滚动

- [ ] **Step 4: 测试侧边栏交互**

在移动端视图下：
- 点击汉堡菜单按钮，侧边栏从左侧滑出
- 点击遮罩层，侧边栏关闭
- 点击导航链接，侧边栏自动关闭并跳转

- [ ] **Step 5: 测试响应式切换**

调整浏览器窗口大小，从桌面端切换到移动端，再切换回来
验证：布局平滑切换，无错误

- [ ] **Step 6: 停止开发服务器**

Run: 按 Ctrl+C 停止开发服务器
Expected: 服务器停止

---

## 自审检查清单

### 规范覆盖检查
- [x] Viewport meta 标签 - Task 1
- [x] Sheet 组件安装 - Task 2
- [x] Sidebar Context - Task 3
- [x] Sidebar 响应式重构 - Task 4
- [x] Header 汉堡菜单 - Task 5
- [x] Dashboard Layout 调整 - Task 6
- [x] 表格横向滚动 - Task 7
- [x] 功能测试 - Task 8

### 占位符检查
- [x] 无 "TBD" 或 "TODO"
- [x] 所有代码步骤都包含完整代码
- [x] 所有命令都有明确的预期输出

### 类型一致性检查
- [x] Context 接口：`isOpen`, `toggle`, `close` - 在所有任务中一致
- [x] 组件命名：`SidebarContent`, `DesktopSidebar`, `MobileSidebar` - 一致
- [x] 响应式类名：`md:` 断点 - 在所有任务中一致

---

## 实施注意事项

1. **Next.js 16.2.4 注意事项**：
   - 确保 metadata 的 viewport 配置使用对象格式
   - 客户端组件必须使用 `"use client"` 指令

2. **Tailwind CSS v4 注意事项**：
   - 响应式类名语法保持不变（`md:`, `lg:` 等）
   - 确保 `overflow-x-auto` 和 `min-w-[600px]` 语法正确

3. **shadcn/ui 注意事项**：
   - Sheet 组件依赖 Dialog 组件（项目中已有）
   - 如果 CLI 安装失败，可以手动从 shadcn/ui 官网复制代码

4. **Context 使用注意事项**：
   - 所有使用 Context 的组件必须标记为 `"use client"`
   - Provider 必须包裹所有需要访问 Context 的组件

---

## 预期结果

完成所有任务后，项目将具备：

1. ✅ 移动端正确的视口配置
2. ✅ 响应式侧边栏（桌面端固定，移动端抽屉式）
3. ✅ 移动端汉堡菜单按钮
4. ✅ 表格在移动端可横向滚动
5. ✅ 在 768px 断点处平滑切换布局
6. ✅ 良好的移动端用户体验
