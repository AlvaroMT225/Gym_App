import React from "react"
import { AdminSidebar, AdminMobileNav } from "@/components/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <AdminMobileNav />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
