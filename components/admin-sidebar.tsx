"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  QrCode,
  Gift,
  FileText,
  ShieldCheck,
  Settings,
  User,
  LogOut,
  Dumbbell,
  Menu,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useAuth } from "@/lib/auth/auth-context"

const adminNav = [
  { label: "Operacion", href: "/admin/operations", icon: LayoutDashboard },
  { label: "Miembros", href: "/admin/members", icon: Users },
  { label: "Pagos & Cobranza", href: "/admin/billing", icon: CreditCard },
  { label: "Maquinas & QR", href: "/admin/machines", icon: QrCode },
  { label: "Promos", href: "/admin/promos", icon: Gift },
  { label: "Contenido", href: "/admin/content", icon: FileText },
  { label: "Staff & Roles", href: "/admin/staff", icon: ShieldCheck },
  { label: "Ajustes", href: "/admin/settings", icon: Settings },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
          <Dumbbell className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-sans text-lg font-bold tracking-tight text-sidebar-foreground">
            Minthy Admin
          </h1>
          <p className="text-xs text-sidebar-foreground/50">Panel de administracion</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {adminNav.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/operations" && pathname.startsWith(item.href))
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="px-3 py-4 border-t border-sidebar-border flex flex-col gap-1">
        <Link
          href="/admin/account"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
            pathname === "/admin/account"
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <User className="w-4.5 h-4.5 shrink-0" />
          <span>Mi cuenta</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 w-full"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span>Salir</span>
        </button>
      </div>
    </aside>
  )
}

export function AdminMobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 lg:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          <span className="font-bold text-sm">Minthy Admin</span>
        </div>
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Slide-over */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            onKeyDown={(e) => e.key === "Escape" && setMenuOpen(false)}
            role="button"
            tabIndex={0}
            aria-label="Cerrar menu"
          />
          <div className="absolute right-0 top-0 bottom-0 w-72 bg-card shadow-xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-primary" />
                <span className="font-bold text-foreground">Minthy Admin</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 overflow-y-auto">
              <ul className="flex flex-col gap-1">
                {adminNav.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-foreground/70 hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <item.icon className="w-5 h-5 shrink-0" />
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <div className="px-3 py-4 border-t border-border flex flex-col gap-1">
              <Link
                href="/admin/account"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors"
              >
                <User className="w-5 h-5 shrink-0" />
                <span>Mi cuenta</span>
              </Link>
              <button
                onClick={() => { setMenuOpen(false); logout() }}
                className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground/70 hover:bg-muted hover:text-foreground transition-colors w-full"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                <span>Salir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
