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