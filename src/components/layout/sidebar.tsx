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
  PieChart,
  Radar,
} from "lucide-react"
import { useSidebar } from "@/contexts/sidebar-context"
import { useState } from "react"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"

const items = [
  { href: "/", label: "仪表盘", icon: LayoutDashboard },
  { href: "/assets/batch", label: "快速记账", icon: PlusCircle },
  { href: "/accounts", label: "账户管理", icon: Wallet },
  { href: "/assets", label: "资产记录", icon: TrendingUp },
  { href: "/portfolio", label: "投资持仓", icon: PieChart },
  { href: "/market-radar", label: "财富驾驶舱", icon: Radar },
  { href: "/transactions", label: "流水记录", icon: ArrowLeftRight },
]

const reportItems = [
  { href: "/reports", label: "收益报表", icon: BarChart3 },
  { href: "/reports/calendar", label: "周收益日历", icon: Calendar },
]

function SidebarContent() {
  const pathname = usePathname()
  const { close } = useSidebar()
  const [reportsOpen, setReportsOpen] = useState(pathname.startsWith("/reports"))
  const isActive = (href: string) => pathname === href

  return (
    <div className="flex h-full flex-col">
      <div className="mb-8 px-5 pt-2">
        <Link href="/" onClick={close} className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#d4e866] text-[#203d31] shadow-[0_6px_18px_rgba(212,232,102,0.18)]">
            <span className="text-lg font-black tracking-[-0.12em]">躺</span>
            <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-[#203d31] bg-[#f4bd4b]" />
          </div>
          <div>
            <h1 className="text-[17px] font-semibold tracking-tight text-[#f5f7ec]">躺盈记账</h1>
            <p className="mt-0.5 text-[11px] tracking-wide text-[#9db3a1]">让财富，自动变清晰</p>
          </div>
        </Link>
      </div>

      <nav className="space-y-1 px-3">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#789381]">工作台</p>
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all",
              isActive(item.href)
                ? "bg-[#d8eb86] text-[#1f3a2f] shadow-[0_8px_20px_rgba(216,235,134,0.12)]"
                : "text-[#afc2af] hover:bg-[#2b4b3b] hover:text-[#f5f7ec]"
            )}
          >
            <item.icon className="h-[17px] w-[17px] opacity-80 transition group-hover:opacity-100" />
            {item.label}
          </Link>
        ))}

        <div className="pt-1">
          <button
            onClick={() => setReportsOpen(!reportsOpen)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-medium transition-all",
              pathname.startsWith("/reports")
                ? "bg-[#d8eb86] text-[#1f3a2f]"
                : "text-[#afc2af] hover:bg-[#2b4b3b] hover:text-[#f5f7ec]"
            )}
          >
            <span className="flex items-center gap-3">
              <BarChart3 className="h-[17px] w-[17px] opacity-80" />
              <span>收益报表</span>
            </span>
            <ChevronRight className={cn("h-4 w-4 opacity-70 transition-transform", reportsOpen && "rotate-90")} />
          </button>
          {reportsOpen && (
            <div className="ml-4 mt-1 space-y-1 border-l border-[#3b5c49] pl-2">
              {reportItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-[#365847] text-[#e6f29f]"
                      : "text-[#8fa895] hover:bg-[#2b4b3b] hover:text-[#f5f7ec]"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="mt-auto px-5 pb-5">
        <div className="rounded-2xl border border-[#3b5b48] bg-[#294b3b] p-4">
          <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-[#d8eb86] text-[#254434]">
            <span className="text-sm font-black">¥</span>
          </div>
          <p className="text-sm font-medium text-[#f5f7ec]">每周更新一次</p>
          <p className="mt-1 text-xs leading-5 text-[#9db3a1]">记录快照，复盘增长，让每一笔钱都有迹可循。</p>
        </div>
      </div>
    </div>
  )
}

function DesktopSidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] border-r border-[#355441] bg-[#203d31] pt-5 md:block">
      <SidebarContent />
    </aside>
  )
}

function MobileSidebar() {
  const { isOpen, close } = useSidebar()

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && close()}>
      <SheetContent side="left" className="w-64 border-[#355441] bg-[#203d31] p-0 text-[#f5f7ec]">
        <SheetTitle className="sr-only">导航菜单</SheetTitle>
        <div className="h-full pt-5">
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
