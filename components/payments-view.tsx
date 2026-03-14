"use client"

import { useState, useEffect, useMemo } from "react"
import {
  CreditCard,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  Users,
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

// ── Status display configs (unchanged) ───────────────────────

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

// ── DB → UI label maps ────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  basic: "Básico",
  premium: "Premium",
  vip: "VIP",
  custom: "Personalizado",
}

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  app: "App",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
}

// ── API DTOs ──────────────────────────────────────────────────

interface MembershipDto {
  id: string
  planType: string | null
  status: string
  startDate: string | null
  endDate: string | null
  autoRenew: boolean
  pricePaid: number | null
}

interface NextPaymentDto {
  id: string
  amount: number
  status: string
  dueDate: string | null
  paidAt: string | null
  method: string | null
  referenceCode: string | null
}

interface PaymentHistoryItem {
  id: string
  amount: number
  status: string
  method: string | null
  dueDate: string | null
  paidAt: string | null
}

interface PayAlert {
  id: string
  message: string
  type: "warning" | "danger" | "info"
  date: string
}

// ── Component ─────────────────────────────────────────────────

export function PaymentsView() {
  // Admin tab data stays in the store (not migrated in this phase)
  const { gymMembers, markPaymentReceived, sendReminder } = useStore()
  const { hasPermission } = useAuth()

  // Athlete tab: fetched from Supabase
  const [membership, setMembership] = useState<MembershipDto | null>(null)
  const [nextPayment, setNextPayment] = useState<NextPaymentDto | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAll() {
      try {
        const [membershipRes, paymentsRes] = await Promise.all([
          fetch("/api/user/membership"),
          fetch("/api/user/payments"),
        ])

        if (membershipRes.ok) {
          const data = await membershipRes.json()
          setMembership(data.membership ?? null)
          setNextPayment(data.nextPayment ?? null)
        }

        if (paymentsRes.ok) {
          const data = await paymentsRes.json()
          setPaymentHistory(data.payments ?? [])
        }
      } catch (err) {
        console.error("PaymentsView: error fetching data", err)
      } finally {
        setLoading(false)
      }
    }

    fetchAll()
  }, [])

  // Derive UI status from DB membership status
  const uiStatus = useMemo<"al dia" | "por vencer" | "vencido">(() => {
    if (!membership) return "al dia"
    switch (membership.status) {
      case "active":    return "al dia"
      case "pending":   return "por vencer"
      case "expired":
      case "suspended":
      case "inactive":  return "vencido"
      default:          return "al dia"
    }
  }, [membership])

  // Human-readable plan label
  const planLabel = useMemo(() => {
    const raw = membership?.planType ?? ""
    return PLAN_LABELS[raw] ?? raw ?? "—"
  }, [membership])

  // Date to show for next due payment
  const nextDueDate = nextPayment?.dueDate ?? membership?.endDate ?? ""

  // Derive alerts from next payment state
  const alerts = useMemo<PayAlert[]>(() => {
    if (!nextPayment) return []

    const now = new Date()
    const dueDate = nextPayment.dueDate ? new Date(nextPayment.dueDate) : null
    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null

    if (nextPayment.status === "overdue") {
      return [
        {
          id: "alert-overdue",
          message: "Tu pago está vencido. Contacta al gym para regularizar tu situación.",
          type: "danger",
          date: now.toISOString(),
        },
      ]
    }

    if (nextPayment.status === "pending" && daysUntilDue !== null && daysUntilDue <= 7) {
      return [
        {
          id: "alert-warning",
          message: `Tu pago vence pronto: ${nextPayment.dueDate ? formatDateLong(nextPayment.dueDate) : ""}. Tenlo listo.`,
          type: "warning",
          date: now.toISOString(),
        },
      ]
    }

    return []
  }, [nextPayment])

  const canManageBilling = hasPermission("billing:manage")
  const StatusIcon = statusConfig[uiStatus].icon

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
        {loading ? (
          <Card className="border border-border">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Cargando tu plan…
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Alerts derived from payment status */}
            {alerts.map((alert) => (
              <Card
                key={alert.id}
                className={`border ${
                  alert.type === "danger"
                    ? "border-destructive/30 bg-destructive/5"
                    : alert.type === "warning"
                    ? "border-accent/30 bg-accent/5"
                    : "border-primary/20 bg-primary/5"
                }`}
              >
                <CardContent className="flex items-start gap-3 py-3">
                  {alert.type === "danger" ? (
                    <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  ) : alert.type === "warning" ? (
                    <Clock className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  ) : (
                    <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  )}
                  <p className="text-sm text-foreground">{alert.message}</p>
                </CardContent>
              </Card>
            ))}

            {/* Status card */}
            {!membership ? (
              <Card className="border border-dashed border-muted-foreground/20 bg-muted/30 shadow-none">
                <CardContent className="flex flex-col items-center py-8 text-center">
                  <CreditCard className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm text-muted-foreground">Sin membresía activa.</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contacta al gym para activar tu plan.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border border-border">
                <CardContent className="py-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-xl ${statusConfig[uiStatus].color}`}
                    >
                      <StatusIcon className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-foreground">Plan {planLabel}</h3>
                        <Badge className={`border-0 ${statusConfig[uiStatus].color}`}>
                          {statusConfig[uiStatus].label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Proximo pago: {nextDueDate ? formatDateLong(nextDueDate) : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <Calendar className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-semibold text-foreground">{planLabel}</p>
                      <p className="text-xs text-muted-foreground">Plan</p>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <Receipt className="w-4 h-4 text-muted-foreground mx-auto mb-1" />
                      <p className="text-sm font-semibold text-foreground">
                        ${paymentHistory[0]?.amount ?? nextPayment?.amount ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Monto</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Payment history */}
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-primary" />
                  Historial de pagos
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {paymentHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Sin historial de pagos.
                  </p>
                ) : (
                  paymentHistory.map((entry, i) => (
                    <div
                      key={`pay-${i}-${entry.id}`}
                      className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium text-foreground">${entry.amount}</p>
                          <p className="text-xs text-muted-foreground">
                            {METHOD_LABELS[entry.method ?? ""] ?? entry.method ?? "—"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          {formatDateLong(entry.dueDate ?? entry.paidAt ?? "")}
                        </p>
                        <Badge className="bg-primary/10 text-primary border-0 text-xs">
                          {PAYMENT_STATUS_LABELS[entry.status] ?? entry.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </TabsContent>

      {/* GYM PANEL VIEW - ADMIN ONLY — untouched */}
      {canManageBilling && (
        <TabsContent value="gym" className="flex flex-col gap-4 mt-0">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border border-border">
              <CardContent className="flex flex-col items-center py-3 text-center">
                <p className="text-xl font-bold text-foreground">
                  {gymMembers.filter((m) => m.status === "al_dia").length}
                </p>
                <p className="text-xs text-muted-foreground">Al dia</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="flex flex-col items-center py-3 text-center">
                <p className="text-xl font-bold text-accent">
                  {gymMembers.filter((m) => m.status === "por_vencer").length}
                </p>
                <p className="text-xs text-muted-foreground">Por vencer</p>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="flex flex-col items-center py-3 text-center">
                <p className="text-xl font-bold text-destructive">
                  {gymMembers.filter((m) => m.status === "vencido").length}
                </p>
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
                  <div
                    key={member.id}
                    className="flex items-center justify-between px-3 py-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {member.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Plan {member.plan} | Vence: {formatDateLong(member.nextPayment)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`border-0 text-xs ${config.color}`}>{config.label}</Badge>
                      {(member.status === "por_vencer" || member.status === "vencido") && (
                        <div className="flex gap-1">
                          {!member.reminderSent ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => sendReminder(member.id)}
                              className="text-xs bg-transparent"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Recordar
                            </Button>
                          ) : (
                            <Badge variant="secondary" className="text-xs">Enviado</Badge>
                          )}
                          <Button
                            size="sm"
                            onClick={() => markPaymentReceived(member.id)}
                            className="text-xs"
                          >
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
