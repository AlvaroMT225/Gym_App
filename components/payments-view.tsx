"use client"

import { useState } from "react"
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Users,
  Shield,
  Receipt,
  Info,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth/auth-context"
import { formatDateLong } from "@/lib/utils"

const statusConfig = {
  "al dia": { color: "bg-primary/10 text-primary", icon: CheckCircle2, label: "Al dia" },
  "por vencer": { color: "bg-accent/15 text-accent", icon: Clock, label: "Por vencer" },
  "vencido": { color: "bg-destructive/10 text-destructive", icon: AlertTriangle, label: "Vencido" },
}

const memberStatusConfig = {
  al_dia: { color: "bg-primary/10 text-primary", label: "Al dia" },
  por_vencer: { color: "bg-accent/15 text-accent", label: "Por vencer" },
  vencido: { color: "bg-destructive/10 text-destructive", label: "Vencido" },
}

export function PaymentsView() {
  const { payment, gymMembers, markPaymentReceived, sendReminder } = useStore()
  const { hasPermission } = useAuth()

  const canManageBilling = hasPermission("billing:manage")
  const StatusIcon = statusConfig[payment.status].icon

  return (
    <Tabs defaultValue="user" className="flex flex-col gap-4">
      <TabsList className={`grid ${canManageBilling ? "grid-cols-2" : "grid-cols-1"} w-full`}>
        <TabsTrigger value="user" className="text-xs">Mi pago</TabsTrigger>
        {canManageBilling && (
          <TabsTrigger value="gym" className="text-xs">Panel Gym</TabsTrigger>
        )}
      </TabsList>

      {/* USER VIEW */}
      <TabsContent value="user" className="flex flex-col gap-4 mt-0">
        {/* Alerts */}
        {payment.alerts.map((alert) => (
          <Card key={alert.id} className={`border ${
            alert.type === "danger" ? "border-destructive/30 bg-destructive/5" :
            alert.type === "warning" ? "border-accent/30 bg-accent/5" :
            "border-primary/20 bg-primary/5"
          }`}>
            <CardContent className="flex items-start gap-3 py-3">
              {alert.type === "danger" ? <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" /> :
               alert.type === "warning" ? <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" /> :
               <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />}
              <p className="text-sm text-foreground">{alert.message}</p>
            </CardContent>
          </Card>
        ))}

        {/* Status card */}
        <Card className="border border-border">
          <CardContent className="py-5">
            <div className="flex items-center gap-4 mb-4">
              <div className={`flex items-center justify-center w-14 h-14 rounded-xl ${statusConfig[payment.status].color}`}>
                <StatusIcon className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-bold text-foreground">Plan {payment.planPeriod}</h3>
                  <Badge className={`border-0 ${statusConfig[payment.status].color}`}>
                    {statusConfig[payment.status].label}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Proximo pago: {formatDateLong(payment.nextDueDate)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted rounded-lg p-3 text-center">
                <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-semibold text-foreground">{payment.planPeriod}</p>
                <p className="text-xs text-muted-foreground">Periodo</p>
              </div>
              <div className="bg-muted rounded-lg p-3 text-center">
                <Receipt className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm font-semibold text-foreground">${payment.history[0]?.amount || 0}</p>
                <p className="text-xs text-muted-foreground">Monto</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Receipt className="w-4 h-4 text-primary" />
              Historial de pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {payment.history.map((entry, i) => (
              <div key={`pay-${i}-${entry.date}`} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">${entry.amount}</p>
                    <p className="text-xs text-muted-foreground">{entry.method}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{formatDateLong(entry.date)}</p>
                  <Badge className="bg-primary/10 text-primary border-0 text-xs">{entry.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </TabsContent>

      {/* GYM PANEL VIEW - ADMIN ONLY */}
      {canManageBilling && (
      <TabsContent value="gym" className="flex flex-col gap-4 mt-0">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center py-3 text-center">
              <p className="text-xl font-bold text-foreground">{gymMembers.filter((m) => m.status === "al_dia").length}</p>
              <p className="text-xs text-muted-foreground">Al dia</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center py-3 text-center">
              <p className="text-xl font-bold text-accent">{gymMembers.filter((m) => m.status === "por_vencer").length}</p>
              <p className="text-xs text-muted-foreground">Por vencer</p>
            </CardContent>
          </Card>
          <Card className="border border-border">
            <CardContent className="flex flex-col items-center py-3 text-center">
              <p className="text-xl font-bold text-destructive">{gymMembers.filter((m) => m.status === "vencido").length}</p>
              <p className="text-xs text-muted-foreground">Vencidos</p>
            </CardContent>
          </Card>
        </div>

        {/* Members list */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Miembros
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {gymMembers.map((member) => {
              const config = memberStatusConfig[member.status]
              return (
                <div key={member.id} className="flex items-center justify-between px-3 py-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {member.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.name}</p>
                      <p className="text-xs text-muted-foreground">Plan {member.plan} | Vence: {formatDateLong(member.nextPayment)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border-0 text-xs ${config.color}`}>{config.label}</Badge>
                    {(member.status === "por_vencer" || member.status === "vencido") && (
                      <div className="flex gap-1">
                        {!member.reminderSent ? (
                          <Button variant="outline" size="sm" onClick={() => sendReminder(member.id)} className="text-xs bg-transparent">
                            <Send className="w-3 h-3 mr-1" />
                            Recordar
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Enviado</Badge>
                        )}
                        <Button size="sm" onClick={() => markPaymentReceived(member.id)} className="text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Pago
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </TabsContent>
      )}
    </Tabs>
  )
}
