"use client"

import { NavUser } from "./nav-user"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useSidebar } from "@/contexts/sidebar-context"
import { usePathname } from "next/navigation"

const pageNames: Record<string, string> = {
  "/": "总览",
  "/accounts": "账户管理",
  "/assets": "资产记录",
  "/portfolio": "投资持仓",
  "/market-radar": "财富驾驶舱",
  "/transactions": "流水记录",
  "/reports": "收益报表",
}

export function Header() {
  const { isOpen, toggle } = useSidebar()
  const pathname = usePathname()
  const pageName = Object.entries(pageNames).find(([path]) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)))?.[1] || "工作台"

  return (
    <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-[#dfe6d8]/80 bg-[#f6f8f3]/85 px-4 backdrop-blur-xl sm:px-6 lg:px-10">
      <Button
        variant="ghost"
        size="icon"
        className="mr-3 text-[#244538] md:hidden"
        onClick={toggle}
        aria-label={isOpen ? "关闭菜单" : "打开菜单"}
        aria-expanded={isOpen}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden items-center gap-3 md:flex">
        <span className="text-sm font-medium text-[#294b3b]">{pageName}</span>
        <span className="h-1 w-1 rounded-full bg-[#b4c3ae]" />
        <span className="text-sm text-[#829486]">个人财富工作台</span>
      </div>

      <NavUser />
    </header>
  )
}
