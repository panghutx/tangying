# 移动端响应式设计规范

**日期**: 2026-05-04  
**状态**: 已批准  
**作者**: Claude Sonnet 4

## 概述

为"躺盈记账"项目添加完整的移动端适配支持，使应用在手机和平板设备上能够正常使用。当前项目仅针对桌面端设计，在移动端存在布局错乱、侧边栏遮挡内容、表格溢出等问题。

## 目标

1. 在移动端提供流畅的用户体验
2. 保持桌面端现有的布局和交互
3. 使用响应式设计，在不同屏幕尺寸下自动适配
4. 遵循移动端 UI 最佳实践

## 设计决策

### 响应式断点
- **断点**: 768px（Tailwind CSS 的 `md` 断点）
- **小于 768px**: 移动端布局（手机、小平板）
- **大于等于 768px**: 桌面端布局（平板横屏、笔记本、台式机）

### 侧边栏交互方案
选择**汉堡菜单 + 抽屉式侧边栏**方案：
- **移动端**: 点击汉堡菜单图标，侧边栏从左侧滑出覆盖在内容上方
- **桌面端**: 侧边栏始终固定显示在左侧
- **优势**: 符合移动端用户习惯，节省屏幕空间，交互直观

### 表格处理方案
选择**横向滚动**方案：
- 表格保持原有结构，在移动端可以左右滑动查看
- 实现简单，保持数据完整性
- 添加 `overflow-x-auto` 容器包裹表格

### 动画实现方案
使用 **shadcn/ui Sheet 组件**：
- 利用项目已有的 shadcn/ui 生态系统
- 组件功能完善（遮罩层、关闭动画、无障碍支持）
- 与项目现有 UI 风格一致

## 架构设计

### 整体架构

```
┌─────────────────────────────────────┐
│         Root Layout                 │
│  + viewport meta 标签               │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│      Dashboard Layout               │
│  + SidebarProvider (Context)        │
│  + 响应式左边距 (md:ml-64)          │
└─────────────────────────────────────┘
              │
        ┌─────┴─────┐
        ▼           ▼
   ┌────────┐  ┌────────┐
   │ Header │  │Sidebar │
   │+ 汉堡  │  │桌面/移 │
   │  菜单  │  │动双模式│
   └────────┘  └────────┘
```

### 组件层次结构

1. **SidebarContext** (新增)
   - 管理侧边栏开关状态
   - 提供 `isOpen`, `toggle`, `close` 方法
   - 在 Dashboard Layout 中提供

2. **Sidebar 组件** (重构)
   - 拆分为 `SidebarContent` (导航内容) 和容器
   - 桌面端: `<aside className="hidden md:block fixed ...">`
   - 移动端: `<Sheet>` 包裹 `SidebarContent`

3. **Header 组件** (增强)
   - 添加汉堡菜单按钮 (仅移动端显示)
   - 使用 `Menu` 图标 (lucide-react)
   - 点击时调用 Context 的 `toggle` 方法

4. **Sheet 组件** (新增)
   - 从 shadcn/ui 安装
   - 提供抽屉式侧边栏功能

## 实现细节

### 1. Viewport Meta 标签

**文件**: `src/app/layout.tsx`

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

**说明**: 
- `width: "device-width"`: 使视口宽度等于设备宽度
- `initialScale: 1`: 初始缩放比例为 1
- `maximumScale: 1`: 防止用户缩放（可选，根据需求调整）

### 2. Sidebar Context

**文件**: `src/contexts/sidebar-context.tsx` (新建)

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

**说明**:
- 使用 React Context API 管理全局状态
- 提供 `toggle` 用于切换，`close` 用于关闭
- 使用 `"use client"` 标记为客户端组件

### 3. Sheet 组件安装

**命令**: 
```bash
npx shadcn@latest add sheet
```

**说明**:
- Sheet 组件依赖于 Dialog 组件（项目中已有）
- 会自动安装到 `src/components/ui/sheet.tsx`
- 包含 SheetTrigger, SheetContent, SheetHeader 等子组件

### 4. Sidebar 组件重构

**文件**: `src/components/layout/sidebar.tsx`

**结构**:
```typescript
// 1. 提取导航内容为独立组件
function SidebarContent() {
  const pathname = usePathname()
  const { close } = useSidebar()
  
  return (
    <div>
      <div className="mb-8 px-6">
        <h1>躺盈记账</h1>
        <p>躺着也能看清财富增长</p>
      </div>
      <nav>
        {items.map(item => (
          <Link onClick={close} ...>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}

// 2. 桌面端固定侧边栏
function DesktopSidebar() {
  return (
    <aside className="hidden md:block fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white pt-4">
      <SidebarContent />
    </aside>
  )
}

// 3. 移动端抽屉式侧边栏
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

// 4. 导出组合组件
export function Sidebar() {
  return (
    <>
      <DesktopSidebar />
      <MobileSidebar />
    </>
  )
}
```

**关键点**:
- `SidebarContent`: 可复用的导航内容
- `DesktopSidebar`: 使用 `hidden md:block` 仅在桌面端显示
- `MobileSidebar`: 使用 Sheet 组件，受 Context 控制
- 点击导航链接时调用 `close()` 关闭抽屉

### 5. Header 组件增强

**文件**: `src/components/layout/header.tsx`

```typescript
import { NavUser } from "./nav-user"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/contexts/sidebar-context"

export function Header() {
  const { toggle } = useSidebar()
  
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-white px-6">
      {/* 汉堡菜单按钮 - 仅移动端显示 */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={toggle}
      >
        <Menu className="h-5 w-5" />
      </Button>
      
      {/* 桌面端占位 */}
      <div className="hidden md:block" />
      
      <NavUser />
    </header>
  )
}
```

**关键点**:
- 汉堡菜单按钮使用 `md:hidden` 仅在移动端显示
- 使用 `Menu` 图标（lucide-react）
- 点击时调用 Context 的 `toggle` 方法
- 添加占位 div 保持桌面端布局

### 6. Dashboard Layout 调整

**文件**: `src/app/(dashboard)/layout.tsx`

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

**关键点**:
- 使用 `SidebarProvider` 包裹整个布局
- 将 `ml-64` 改为 `md:ml-64`，移动端无左边距
- Header 组件需要改为客户端组件（使用 Context）

### 7. 表格横向滚动

**文件**: `src/app/(dashboard)/page.tsx`

在账户列表表格外层添加滚动容器：

```typescript
<div className="overflow-x-auto">
  <table className="w-full min-w-[600px]">
    {/* 表格内容保持不变 */}
  </table>
</div>
```

**关键点**:
- `overflow-x-auto`: 内容溢出时显示横向滚动条
- `min-w-[600px]`: 设置表格最小宽度，确保列不会被压缩
- 移动端可以左右滑动查看完整表格

## 文件清单

### 需要修改的文件
1. `src/app/layout.tsx` - 添加 viewport metadata
2. `src/app/(dashboard)/layout.tsx` - 调整响应式类名，添加 SidebarProvider
3. `src/components/layout/sidebar.tsx` - 重构为响应式双模式
4. `src/components/layout/header.tsx` - 添加汉堡菜单按钮，改为客户端组件
5. `src/app/(dashboard)/page.tsx` - 表格添加横向滚动容器

### 需要新建的文件
1. `src/components/ui/sheet.tsx` - Sheet 组件（通过 shadcn CLI 安装）
2. `src/contexts/sidebar-context.tsx` - Sidebar 状态管理 Context

## 测试计划

### 功能测试
1. **移动端 (< 768px)**
   - [ ] 页面加载时侧边栏隐藏
   - [ ] 点击汉堡菜单按钮，侧边栏从左侧滑出
   - [ ] 点击遮罩层，侧边栏关闭
   - [ ] 点击导航链接，侧边栏自动关闭
   - [ ] 内容区域占满全宽
   - [ ] 表格可以横向滚动

2. **桌面端 (>= 768px)**
   - [ ] 侧边栏固定显示在左侧
   - [ ] 汉堡菜单按钮隐藏
   - [ ] 内容区域有左边距（256px）
   - [ ] 表格正常显示，无需滚动

3. **响应式切换**
   - [ ] 调整浏览器窗口大小，布局平滑切换
   - [ ] 从桌面端切换到移动端，侧边栏自动隐藏
   - [ ] 从移动端切换到桌面端，侧边栏自动显示

### 兼容性测试
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] 桌面端 Chrome/Firefox/Safari
- [ ] 平板设备（竖屏和横屏）

### 无障碍测试
- [ ] 键盘导航（Tab, Enter, Esc）
- [ ] 屏幕阅读器支持
- [ ] 焦点管理（打开/关闭抽屉时）

## 技术约束

1. **Next.js 版本**: 16.2.4（注意 API 可能与训练数据不同）
2. **Tailwind CSS 版本**: v4（新版本，语法可能有变化）
3. **shadcn/ui**: 已集成，使用现有组件风格
4. **React**: 19.2.4（使用最新特性）

## 风险与缓解

### 风险 1: Sheet 组件安装失败
**缓解**: 如果 shadcn CLI 安装失败，可以手动复制 Sheet 组件代码

### 风险 2: Context 在服务端组件中使用
**缓解**: 确保使用 Context 的组件标记为 `"use client"`

### 风险 3: 表格在极小屏幕上仍然难以阅读
**缓解**: 设置合理的 `min-w` 值，确保横向滚动体验良好

## 未来优化

1. **卡片式布局**: 为移动端提供可选的卡片式账户列表
2. **手势支持**: 添加滑动手势关闭侧边栏
3. **记住用户偏好**: 在桌面端记住侧边栏展开/收起状态
4. **PWA 支持**: 添加 manifest.json，支持安装到主屏幕

## 参考资料

- [Tailwind CSS 响应式设计](https://tailwindcss.com/docs/responsive-design)
- [shadcn/ui Sheet 组件](https://ui.shadcn.com/docs/components/sheet)
- [Next.js Metadata API](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [React Context API](https://react.dev/reference/react/useContext)
