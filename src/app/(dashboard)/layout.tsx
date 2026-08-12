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
      <div className="min-h-screen bg-transparent">
        <Sidebar />
        <div className="md:ml-[248px]">
          <Header />
          <main className="px-4 pb-10 pt-5 sm:px-6 lg:px-10">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  )
}
