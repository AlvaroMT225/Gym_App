"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  ScanLine,
  TrendingUp,
  Award,
  Menu,
  ClipboardList,
  Swords,
  BookOpen,
  Gift,
  CreditCard,
  User,
  Dumbbell,
  X,
  Bell,
  LogOut,
  Users,
  LayoutDashboard,
  Calendar,
  AlertCircle,
  FileText,
  FolderOpen,
  Settings,
  LayoutList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth/auth-context"

const clientBottomTabs = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Máquinas", href: "/dashboard/machines", icon: Dumbbell },
  { label: "Rutina", href: "/dashboard/routines", icon: ClipboardList },
  { label: "Progreso", href: "/dashboard/progress", icon: TrendingUp },
  { label: "Mas", href: "#menu", icon: Menu },
]

const clientMenuItems = [
  { label: "Logros", href: "/dashboard/achievements", icon: Award },
  { label: "Retos & Rankings", href: "/dashboard/challenges", icon: Swords },
  { label: "Tutoriales", href: "/dashboard/tutorials", icon: BookOpen },
  { label: "Promos", href: "/dashboard/promos", icon: Gift },
  { label: "Pagos", href: "/dashboard/payments", icon: CreditCard },
  { label: "Perfil", href: "/dashboard/profile", icon: User },
]

const trainerBottomTabs = [
  { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
  { label: "Atletas", href: "/trainer/clients", icon: Users },
  { label: "Calendario", href: "/trainer/calendar", icon: Calendar },
  { label: "Alertas", href: "/trainer/alerts", icon: AlertCircle },
  { label: "Mas", href: "#menu", icon: Menu },
]

const trainerMenuItems = [
  { label: "Propuestas", href: "/trainer/proposals", icon: FileText },
  { label: "Plantillas", href: "/trainer/templates", icon: FolderOpen },
  { label: "Ejercicios", href: "/trainer/exercises", icon: Dumbbell },
  { label: "Ajustes", href: "/trainer/settings", icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const { notifications } = useStore()
  const { user: authUser, logout } = useAuth()
  const unreadPromoCount = notifications.filter((n) => n.type === "promo" && !n.read).length

  const isTrainer = authUser?.role === "TRAINER"
  const bottomTabs = isTrainer ? trainerBottomTabs : clientBottomTabs
  const menuItems = isTrainer ? trainerMenuItems : clientMenuItems

  return (
    <>
      {/* Slide-over menu */}
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
                <span className="font-bold text-foreground">Minthy Training</span>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4">
              <ul className="flex flex-col gap-1">
                {menuItems.map((item) => {
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
                        <span className="flex-1">{item.label}</span>
                        {item.label === "Promos" && unreadPromoCount > 0 && (
                          <span className="flex items-center gap-1 ml-auto">
                            <Bell className="w-3.5 h-3.5 text-destructive" />
                            <span className="flex items-center justify-center w-4.5 h-4.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                              {unreadPromoCount}
                            </span>
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <div className="px-4 py-4 border-t border-border">
              <div className="flex items-center gap-3 px-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {authUser?.avatar || "??"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{authUser?.name || "Usuario"}</p>
                  <p className="text-xs text-muted-foreground truncate">{authUser?.role || ""}</p>
                </div>
                <button
                  onClick={() => { logout(); setMenuOpen(false) }}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
                  aria-label="Cerrar sesion"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-card border-t border-border shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <ul className="flex items-center justify-around px-2 py-1.5">
          {bottomTabs.map((tab) => {
            const isMenu = tab.href === "#menu"
            const baseHref = isTrainer ? "/trainer" : "/dashboard"
            const isActive =
              !isMenu &&
              (pathname === tab.href ||
                (tab.href !== baseHref && pathname.startsWith(tab.href)))

            if (isMenu) {
              return (
                <li key="menu">
                  <button
                    onClick={() => setMenuOpen(true)}
                    className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-muted-foreground"
                    aria-label="Abrir menu"
                  >
                    <Menu className="w-5 h-5" />
                    <span className="text-[10px] font-medium">Mas</span>
                  </button>
                </li>
              )
            }

            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium">{tab.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
