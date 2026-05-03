import { NavUser } from "./nav-user"

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-end border-b bg-white px-6">
      <NavUser />
    </header>
  )
}