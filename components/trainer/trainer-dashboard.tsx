"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, FileText, ShieldAlert, CalendarDays, MessageSquare, ArrowRight } from "lucide-react"

interface DashboardData {
  clientCount: number
  pendingProposals: number
  expiringConsents: number
  plannedThisWeek: number
  recentActivity: Array<{
    type: string
    clientName: string
    clientAvatar: string
    message: string
    date: string
  }>
}

const quickLinks = [
  { label: "Clientes", href: "/trainer/clients", icon: Users },
  { label: "Propuestas", href: "/trainer/proposals", icon: FileText },
  { label: "Calendario", href: "/trainer/calendar", icon: CalendarDays },
  { label: "Alertas", href: "/trainer/alerts", icon: ShieldAlert },
]

export function TrainerDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/trainer/dashboard")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-6">
        <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <h1 className="text-xl font-bold text-foreground">Dashboard</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.clientCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Clientes activos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.pendingProposals ?? 0}</p>
                <p className="text-xs text-muted-foreground">Propuestas pendientes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.expiringConsents ?? 0}</p>
                <p className="text-xs text-muted-foreground">Consents por vencer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
                <CalendarDays className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{data?.plannedThisWeek ?? 0}</p>
                <p className="text-xs text-muted-foreground">Sesiones esta semana</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Acceso rápido</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground"
            >
              <link.icon className="w-4 h-4 text-muted-foreground" />
              {link.label}
              <ArrowRight className="w-3 h-3 ml-auto text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      {data?.recentActivity && data.recentActivity.length > 0 && (
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              Actividad reciente
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {data.recentActivity.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-muted/30">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                  {item.clientAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.clientName}</p>
                  <p className="text-xs text-muted-foreground truncate">{item.message}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {new Date(item.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
