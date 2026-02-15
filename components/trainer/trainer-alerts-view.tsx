"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, ShieldAlert, ShieldX, Clock, ArrowRight, CheckCircle } from "lucide-react"

interface Alert {
  id: string
  type: "consent_expiring" | "consent_expired" | "proposal_pending" | "low_streak"
  severity: "warning" | "error" | "info"
  clientId: string
  clientName: string
  clientAvatar: string
  message: string
  href: string
}

const typeConfig = {
  consent_expiring: { icon: ShieldAlert, color: "text-amber-500", bg: "bg-amber-500/10", label: "Vence pronto" },
  consent_expired: { icon: ShieldX, color: "text-destructive", bg: "bg-destructive/10", label: "Expirado" },
  proposal_pending: { icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10", label: "Sin respuesta" },
  low_streak: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10", label: "Racha baja" },
}

export function TrainerAlertsView() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/trainer/alerts")
      .then((r) => (r.ok ? r.json() : { alerts: [] }))
      .then((d) => setAlerts(d.alerts || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Alertas</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Alertas</h1>
        {alerts.length > 0 && (
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold">
            {alerts.length}
          </span>
        )}
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">Todo en orden</p>
          <p className="text-xs mt-1">No hay alertas activas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {alerts.map((alert) => {
            const config = typeConfig[alert.type] || typeConfig.consent_expiring
            const Icon = config.icon

            return (
              <Link key={alert.id} href={alert.href}>
                <Card className="border border-border hover:shadow-md transition-all cursor-pointer">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${config.bg} shrink-0`}>
                        <Icon className={`w-4.5 h-4.5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-semibold text-foreground">{alert.clientName}</span>
                          <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
