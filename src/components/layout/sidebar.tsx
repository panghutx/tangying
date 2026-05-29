"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PlusCircle, ChevronRight } from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import { useState } from "react"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"

const items = [
  { href: "/", label: "仪表盘" },
  { href: "/assets/batch", label: "快速记账", icon: PlusCircle },
  { href: "/accounts", label: "账户管理" },
  { href: "/assets", label: "资产记录" },
  { href: "/transactions", label: "流水记录" },
  { href: "/incomes", label: "收益记录" },
]

const reportItems = [
  { href: "/reports", label: "收益报表" },
  { href: "/reports/calendar", label: "周收益日历" },
]

const bottomItems = [
  { href: "/goals", label: "目标追踪" },
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
            <span>收益报表</span>
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
                  {item.label}
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