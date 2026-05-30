"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  PlusCircle,
  ChevronRight,
  LayoutDashboard,
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  BarChart3,
  Calendar,
  DollarSign,
  Target,
} from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"

const items = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/assets/batch", label: "快速记账", icon: PlusCircle },
  { href: "/accounts", label: "账户管理", icon: Wallet },
  { href: "/assets", label: "资产记录", icon: TrendingUp },
  { href: "/transactions", label: "流水记录", icon: ArrowLeftRight },
]

const reportItems = [
  { href: "/reports", label: "收益报表", icon: BarChart3 },
  { href: "/reports/calendar", label: "周收益日历", icon: Calendar },
]

const bottomItems = [
  { href: "/incomes", label: "收益记录", icon: DollarSign },
  { href: "/goals", label: "目标追踪", icon: Target },
]

function SidebarContent() {
  const pathname = usePathname()
  const { close } = useSidebar()
  const [reportsOpen, setReportsOpen] = useState(
    pathname.startsWith("/reports")
  )

  const isActive = (href: string) => pathname === href

  return (
    <div>
      <div className="mb-6 px-6">
        <Link href="/" onClick={close} className="flex items-center gap-3 mb-2">
          {/* Logo: 可爱小人躺着数钱 */}
          <svg
            width="40"
            height="40"
            viewBox="0 0 40 40"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            {/* 圆脸背景 */}
            <circle cx="20" cy="20" r="18" fill="#fef9c3" stroke="#facc15" strokeWidth="2" />
            {/* 躺着小人身体 - 圆润的椭圆 */}
            <ellipse cx="20" cy="24" rx="10" ry="6" fill="#c4b5fd" />
            {/* 小人头 - 圆圆的 */}
            <circle cx="14" cy="20" r="6" fill="#fcd34d" />
            {/* 可爱眼睛 - 两个点 */}
            <circle cx="12" cy="19" r="1" fill="#1f2937" />
            <circle cx="16" cy="19" r="1" fill="#1f2937" />
            {/* 微笑 */}
            <path d="M12 22 Q14 24 16 22" stroke="#1f2937" strokeWidth="0.8" fill="none" strokeLinecap="round" />
            {/* 躺着的手臂 - 正在数钱 */}
            <ellipse cx="26" cy="22" rx="4" ry="2.5" fill="#fcd34d" />
            {/* 钱币 - 圆润的金币 */}
            <circle cx="30" cy="18" r="3" fill="#fbbf24" stroke="#f59e0b" strokeWidth="0.8" />
            <circle cx="33" cy="22" r="2.5" fill="#f59e0b" />
            {/* 钱币上的 $ 符号 */}
            <text x="29" y="19.5" fontSize="3" fill="#92400e" fontWeight="bold" textAnchor="middle">$</text>
            {/* 星星装饰 */}
            <path d="M26 12 l1 2.5 2.5 0.5 -2 1.5 0.5 2.5 -2 -1.5 -2 1.5 0.5 -2.5 -2 -1.5 2.5 -0.5z" fill="#fbbf24" />
          </svg>
          <div>
            <h1 className="text-xl font-bold text-gray-800">躺盈记账</h1>
            <p className="text-xs text-gray-400">躺着也能看清财富增长</p>
          </div>
        </Link>
      </div>
      <nav className="space-y-1 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              isActive(item.href)
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            {item.icon && <item.icon className="h-4 w-4" />}
            {item.label}
          </Link>
        ))}

        {/* Reports section */}
        <div>
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className={cn(
              "flex items-center justify-between w-full rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/reports")
                ? "bg-blue-50 text-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <span className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span>收益报表</span>
            </span>
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform",
                reportsOpen && "rotate-90"
              )}
            />
          </button>
          {reportsOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {reportItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center rounded-lg px-4 py-2 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {item.icon && <item.icon className="h-4 w-4" />}
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors",
              isActive(item.href)
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
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="left" className="w-64 p-0">
        <SheetTitle className="sr-only">导航菜单</SheetTitle>
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