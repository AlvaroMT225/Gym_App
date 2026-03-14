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
  Sparkles,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth/auth-context"
import { formatDateLong } from "@/lib/utils"
import { toast } from "sonner"

// ── Status display configs ─────────────────────────────────────

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

// ── Plan type maps ─────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
}

// Days per plan type — used for savings calculation
const PLAN_DAYS: Record<string, number> = {
  daily: 1,
  weekly: 7,
  biweekly: 15,
  monthly: 30,
  quarterly: 90,
  annual: 365,
}

const PLAN_TYPE_ORDER = ["daily", "weekly", "biweekly", "monthly", "quarterly", "annual"]

const METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  app: "App",
  stripe: "Pago online",
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
}

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Activo",
  pending: "Pendiente",
  expired: "Vencido",
  suspended: "Suspendido",
  inactive: "Inactivo",
}

// ── API DTOs ───────────────────────────────────────────────────

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

interface PlanPrice {
  id: string
  plan_type: string
  price: number
  is_active: boolean
}

interface CurrentPlan {
  plan_type: string | null
  price_paid: number | null
  status: string
  end_date: string | null
}

// ── Component ──────────────────────────────────────────────────

export function PaymentsView() {
  const { gymMembers, markPaymentReceived, sendReminder } = useStore()
  const { hasPermission } = useAuth()

  // Athlete tab: fetched from Supabase
  const [membership, setMembership] = useState<MembershipDto | null>(null)
  const [nextPayment, setNextPayment] = useState<NextPaymentDto | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  // Available plans
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([])
  const [currentPlan, setCurrentPlan] = useState<CurrentPlan | null>(null)
  const [plansLoading, setPlansLoading] = useState(true)

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

    async function fetchPlans() {
      try {
        const res = await fetch("/api/client/plan-prices")
        if (res.ok) {
          const data = await res.json()
          const sorted = (data.data as PlanPrice[] ?? []).sort(
            (a, b) => PLAN_TYPE_ORDER.indexOf(a.plan_type) - PLAN_TYPE_ORDER.indexOf(b.plan_type)
          )
          setPlanPrices(sorted)
          setCurrentPlan(data.currentPlan ?? null)
        }
      } catch (err) {
        console.error("PaymentsView: error fetching plans", err)
      } finally {
        setPlansLoading(false)
      }
    }

    fetchAll()
    fetchPlans()
  }, [])

  // Derive UI status from membership status + end_date (single source of truth)
  const uiStatus = useMemo<"al dia" | "por vencer" | "vencido">(() => {
    if (!membership) return "al dia"
    if (membership.status === "active") {
      if (!membership.endDate) return "al dia"
      const daysLeft = Math.ceil(
        (new Date(membership.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      // ≤7 days left → "por vencer"; already past → "por vencer" (not "vencido" while status=active)
      return daysLeft > 7 ? "al dia" : "por vencer"
    }
    switch (membership.status) {
      case "pending":   return "por vencer"
      case "expired":
      case "suspended":
      case "inactive":  return "vencido"
      default:          return "al dia"
    }
  }, [membership])

  // Human-readable plan label (supports both old and new enum for backward compat)
  const planLabel = useMemo(() => {
    const raw = membership?.planType ?? ""
    return PLAN_LABELS[raw] ?? raw ?? "—"
  }, [membership])

  // "Próximo pago" — reads ONLY from the earliest pending payment in paymentHistory.
  // No calculation, no fallback to nextPayment or membership dates.
  const nextDueDate = useMemo<string | null>(() => {
    const pending = paymentHistory
      .filter((p) => p.status === "pending" && p.dueDate)
      .sort((a, b) => ((a.dueDate ?? "") < (b.dueDate ?? "") ? -1 : 1))[0]
    return pending?.dueDate ?? null
  }, [paymentHistory])

  // Alerts — derived strictly from paymentHistory statuses and nextDueDate.
  // Never reads nextPayment.dueDate (which can be a computed/stale date from the API).
  const alerts = useMemo<PayAlert[]>(() => {
    const now = new Date()

    // Red: any overdue payment on record
    const hasOverdue = paymentHistory.some((p) => p.status === "overdue")
    if (hasOverdue) {
      return [{
        id: "alert-overdue",
        message: "Tu pago está vencido. Contacta al gym para regularizar tu situación.",
        type: "danger",
        date: now.toISOString(),
      }]
    }

    if (nextDueDate) {
      const daysUntilDue = Math.ceil(
        (new Date(nextDueDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )
      // Red: pending payment whose due_date is already past
      if (daysUntilDue < 0) {
        return [{
          id: "alert-pending-past",
          message: `Tu pago está vencido desde ${formatDateLong(nextDueDate)}. Contacta al gym.`,
          type: "danger",
          date: now.toISOString(),
        }]
      }
      // Yellow: due today or within the next 7 days
      if (daysUntilDue <= 7) {
        return [{
          id: "alert-warning",
          message: `Tu pago vence pronto: ${formatDateLong(nextDueDate)}. Tenlo listo.`,
          type: "warning",
          date: now.toISOString(),
        }]
      }
    }

    return []
  }, [paymentHistory, nextDueDate])

  // Savings calculation vs monthly price (reference base)
  // Formula: monthlyEquivalent = price × (30 / planDays)
  // savings = round((1 - monthlyEquivalent / monthlyPrice) × 100)
  const monthlyPrice = useMemo(() => {
    const monthly = planPrices.find((p) => p.plan_type === "monthly")
    return monthly ? Number(monthly.price) : null
  }, [planPrices])

  function getSavingsPct(plan: PlanPrice): number | null {
    if (!monthlyPrice || plan.plan_type === "monthly") return null
    const days = PLAN_DAYS[plan.plan_type]
    if (!days) return null
    const monthlyEquivalent = Number(plan.price) * (30 / days)
    if (monthlyEquivalent >= monthlyPrice) return null
    return Math.round((1 - monthlyEquivalent / monthlyPrice) * 100)
  }

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

      {/* ── USER VIEW ── */}
      <TabsContent value="user" className="flex flex-col gap-4 mt-0">
        {loading ? (
          <Card className="border border-border">
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              Cargando tu plan…
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Alerts */}
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

            {/* Membresía actual */}
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
                        {nextDueDate
                          ? `Próximo pago: ${formatDateLong(nextDueDate)}`
                          : "Sin pagos pendientes"}
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
                        ${membership.pricePaid ?? nextPayment?.amount ?? 0}
                      </p>
                      <p className="text-xs text-muted-foreground">Monto</p>
                    </div>
                  </div>

                  {/* Current plan details from plan-prices API */}
                  {currentPlan && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        Estado membresía:{" "}
                        <span className="font-medium text-foreground">
                          {MEMBERSHIP_STATUS_LABELS[currentPlan.status] ?? currentPlan.status}
                        </span>
                      </span>
                      {currentPlan.end_date && (
                        <>
                          <span>·</span>
                          <span>
                            Vence:{" "}
                            <span className="font-medium text-foreground">
                              {formatDateLong(currentPlan.end_date)}
                            </span>
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Planes Disponibles ── */}
            <Card className="border border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Planes Disponibles
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {plansLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border">
                      <div className="flex flex-col gap-1.5">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-5 w-14" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))
                ) : planPrices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No hay planes disponibles en este momento.
                  </p>
                ) : (
                  planPrices.map((plan) => {
                    const isCurrentPlan =
                      currentPlan?.plan_type === plan.plan_type ||
                      membership?.planType === plan.plan_type
                    const savings = getSavingsPct(plan)

                    return (
                      <div
                        key={plan.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          isCurrentPlan
                            ? "border-primary/40 bg-primary/5"
                            : "border-border hover:border-border/80 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground">
                              {PLAN_LABELS[plan.plan_type] ?? plan.plan_type}
                            </span>
                            {isCurrentPlan && (
                              <Badge className="bg-primary/15 text-primary border-0 text-xs h-5">
                                Tu plan actual
                              </Badge>
                            )}
                            {savings !== null && savings > 0 && (
                              <Badge variant="secondary" className="text-xs h-5 text-green-600 bg-green-500/10 border-0">
                                Ahorra {savings}%
                              </Badge>
                            )}
                          </div>
                          <span className="text-lg font-bold text-foreground font-mono">
                            ${Number(plan.price).toFixed(2)}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant={isCurrentPlan ? "outline" : "default"}
                          className="shrink-0 text-xs"
                          onClick={() =>
                            toast.info("Pago online próximamente", {
                              description: `El plan ${PLAN_LABELS[plan.plan_type] ?? plan.plan_type} estará disponible para contratación online muy pronto.`,
                            })
                          }
                        >
                          {isCurrentPlan ? "Plan activo" : "Contratar"}
                        </Button>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>

            {/* Historial de pagos */}
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

      {/* ── GYM PANEL VIEW - ADMIN ONLY ── */}
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
                        {member.name.split(" ").map((n: string) => n[0]).join("")}
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
