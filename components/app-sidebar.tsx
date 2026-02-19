"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  ClipboardList,
  TrendingUp,
  Award,
  Swords,
  BookOpen,
  Gift,
  CreditCard,
  User,
  Dumbbell,
  Bell,
  LogOut,
  Users,
  LayoutDashboard,
  FileText,
  FolderOpen,
  Calendar,
  AlertCircle,
  Settings,
  LayoutList,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth/auth-context"

const clientNavItems = [
  { label: "Inicio", href: "/dashboard", icon: Home },
  { label: "Máquinas", href: "/dashboard/machines", icon: Dumbbell },
  { label: "Mi Rutina", href: "/dashboard/routines", icon: ClipboardList },
  { label: "Progreso", href: "/dashboard/progress", icon: TrendingUp },
  { label: "Logros", href: "/dashboard/achievements", icon: Award },
  { label: "Retos & Rankings", href: "/dashboard/challenges", icon: Swords },
  { label: "Tutoriales", href: "/dashboard/tutorials", icon: BookOpen },
  { label: "Promos", href: "/dashboard/promos", icon: Gift },
  { label: "Pagos", href: "/dashboard/payments", icon: CreditCard },
  { label: "Perfil", href: "/dashboard/profile", icon: User },
]

const trainerNavItems = [
  { label: "Dashboard", href: "/trainer", icon: LayoutDashboard },
  { label: "Atletas", href: "/trainer/clients", icon: Users },
  { label: "Propuestas", href: "/trainer/proposals", icon: FileText },
  { label: "Plantillas", href: "/trainer/templates", icon: FolderOpen },
  { label: "Calendario", href: "/trainer/calendar", icon: Calendar },
  { label: "Ejercicios", href: "/trainer/exercises", icon: Dumbbell },
  { label: "Alertas", href: "/trainer/alerts", icon: AlertCircle },
  { label: "Ajustes", href: "/trainer/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { notifications } = useStore()
  const { user: authUser, logout } = useAuth()
  const unreadPromoCount = notifications.filter((n) => n.type === "promo" && !n.read).length

  const isTrainer = authUser?.role === "TRAINER"
  const navItems = isTrainer ? trainerNavItems : clientNavItems

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
          <Dumbbell className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-sans text-lg font-bold tracking-tight text-sidebar-foreground">
            Minthy Training
          </h1>
          <p className="text-xs text-sidebar-foreground/50">
            {isTrainer ? "Panel Entrenador" : "Tu gym inteligente"}
          </p>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4">
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/trainer"
                ? pathname === "/trainer"
                : item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href)
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

      {/* Footer */}
      <div className="px-4 py-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 px-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold">
            {authUser?.avatar || "??"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{authUser?.name || "Usuario"}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{authUser?.email || ""}</p>
          </div>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
            aria-label="Cerrar sesion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
