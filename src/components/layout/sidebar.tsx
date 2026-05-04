"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { PlusCircle } from "lucide-react"

const items = [
  { href: "/", label: "仪表盘" },
  { href: "/assets/batch", label: "快速记账", icon: PlusCircle },
  { href: "/accounts", label: "账户管理" },
  { href: "/assets", label: "资产记录" },
  { href: "/transactions", label: "流水记录" },
  { href: "/incomes", label: "收益记录" },
  { href: "/reports", label: "收益报表" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-white pt-4">
      <div className="mb-8 px-6">
        <h1 className="text-xl font-bold text-gray-800">理财聚合</h1>
        <p className="text-xs text-gray-400 mt-1">多平台资产追踪</p>
      </div>
      <nav className="space-y-1 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
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
    </aside>
  )
}