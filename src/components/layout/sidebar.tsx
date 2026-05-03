"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const items = [
  { href: "/", label: "仪表盘" },
  { href: "/accounts", label: "账户管理" },
  { href: "/assets", label: "资产记录" },
  { href: "/incomes", label: "收益记录" },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-gray-50 pt-4">
      <div className="mb-8 px-6">
        <h1 className="text-xl font-bold">理财聚合</h1>
      </div>
      <nav className="space-y-1 px-3">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "block rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              pathname === item.href
                ? "bg-gray-200 text-gray-900"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}