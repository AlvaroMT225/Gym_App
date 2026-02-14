import React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNav } from "@/components/mobile-nav"
import { StoreProvider } from "@/lib/store"
import { TrainerGuard } from "@/components/trainer/trainer-guard"

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 pb-20 lg:pb-0">
          <TrainerGuard>{children}</TrainerGuard>
        </main>
        <MobileNav />
      </div>
    </StoreProvider>
  )
}

