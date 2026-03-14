"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  CreditCard,
  Search,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Plus,
  TrendingUp,
  AlertCircle,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
export const dynamic = 'force-dynamic'


interface PaymentMember {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  plan: string
  planLabel: string
}

interface Payment {
  id: string
  amount: number
  status: string
  statusLabel: string
  method: string | null
  methodLabel: string | null
  referenceCode: string | null
  dueDate: string | null
  paidAt: string | null
  notes: string | null
  createdAt: string | null
  member: PaymentMember | null
}

interface KPIs {
  totalRecaudado: number
  pendientes: number
  vencidos: number
  totalMes: number
}

const paymentStatusConfig: Record<string, {
  label: string
  icon: React.ElementType
  color: string
  bg: string
  badgeClass: string
}> = {
  paid:      { label: "Pagado",       icon: CheckCircle,  color: "text-success",          bg: "bg-success/10",      badgeClass: "bg-success/10 text-success border-0" },
  pending:   { label: "Pendiente",    icon: Clock,        color: "text-amber-600",         bg: "bg-amber-50",        badgeClass: "bg-amber-50 text-amber-700 border-0" },
  overdue:   { label: "Vencido",      icon: XCircle,      color: "text-destructive",       bg: "bg-destructive/10",  badgeClass: "bg-destructive/10 text-destructive border-0" },
  cancelled: { label: "Cancelado",    icon: XCircle,      color: "text-muted-foreground",  bg: "bg-muted/20",        badgeClass: "bg-muted/20 text-muted-foreground border-0" },
  refunded:  { label: "Reembolsado",  icon: AlertCircle,  color: "text-muted-foreground",  bg: "bg-muted/20",        badgeClass: "bg-muted/20 text-muted-foreground border-0" },
}

export default function BillingPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")

  const [registerOpen, setRegisterOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null)
  const [payMethod, setPayMethod] = useState<string>("")
  const [payReference, setPayReference] = useState("")
  const [payNotes, setPayNotes] = useState("")
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loadPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/payments")
      if (!res.ok) return
      const data = await res.json()
      setPayments(data.payments ?? [])
      setKpis(data.kpis ?? null)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPayments() }, [loadPayments])

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.status === "pending" || p.status === "overdue"),
    [payments]
  )

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const name = p.member?.name?.toLowerCase() ?? ""
      const email = p.member?.email?.toLowerCase() ?? ""
      const matchSearch = name.includes(search.toLowerCase()) || email.includes(search.toLowerCase())
      const matchStatus = statusFilter === "todos" || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [payments, search, statusFilter])

  function openRegister(payment?: Payment) {
    setSelectedPayment(payment ?? null)
    setPayMethod("")
    setPayReference("")
    setPayNotes("")
    setSaveSuccess(false)
    setRegisterOpen(true)
  }

  async function handleConfirmPayment() {
    if (!selectedPayment || !payMethod) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/payments/${selectedPayment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: payMethod,
          referenceCode: payReference || undefined,
          notes: payNotes || undefined,
        }),
      })
      if (!res.ok) return
      setSaveSuccess(true)
      await loadPayments()
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  function formatAmount(amount: number) {
    return `$${Number(amount).toFixed(2)}`
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Pagos & Cobranza</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestión de pagos de miembros</p>
        </div>
        <Button onClick={() => openRegister()} className="gap-2" disabled={pendingPayments.length === 0}>
          <Plus className="w-4 h-4" />
          Registrar pago
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-14" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border border-border">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-success/10 shrink-0">
                  <TrendingUp className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-lg font-bold text-foreground leading-tight">
                    {kpis ? formatAmount(kpis.totalRecaudado) : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Recaudado (mes)</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "pending" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "pending" ? "todos" : "pending")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.pendientes ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "overdue" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "overdue" ? "todos" : "overdue")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10 shrink-0">
                  <XCircle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.vencidos ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Vencidos</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-border">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.totalMes ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Pagos del mes</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar miembro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="paid">Pagado</SelectItem>
            <SelectItem value="overdue">Vencido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
            <SelectItem value="refunded">Reembolsado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Payment List */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full hidden sm:block" />
                <Skeleton className="h-5 w-14" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Sin resultados</p>
            </div>
          ) : (
            filtered.map((p) => {
              const cfg = paymentStatusConfig[p.status] ?? paymentStatusConfig.cancelled
              const canPay = p.status === "pending" || p.status === "overdue"
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                    {p.member?.avatar ?? "??"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.member?.name ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.member?.plan ?? "—"} · Vence: {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <Badge className={`${cfg.badgeClass} shrink-0 hidden sm:flex`}>
                    {p.statusLabel}
                  </Badge>
                  <p className="text-sm font-semibold text-foreground shrink-0">
                    {formatAmount(p.amount)}
                  </p>
                  {canPay ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      title="Registrar pago"
                      onClick={() => openRegister(p)}
                    >
                      <DollarSign className="w-4 h-4 text-success" />
                    </Button>
                  ) : (
                    <div className="w-8 shrink-0" />
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Register Payment Sheet */}
      <Sheet
        open={registerOpen}
        onOpenChange={(open) => {
          if (!open) { setRegisterOpen(false); setSaveSuccess(false) }
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar Pago</SheetTitle>
          </SheetHeader>

          {saveSuccess ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">¡Pago registrado!</p>
              <p className="text-sm text-muted-foreground">El pago fue marcado como recibido exitosamente.</p>
              <Button className="mt-2 w-full" onClick={() => { setRegisterOpen(false); setSaveSuccess(false) }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Pago pendiente</Label>
                <Select
                  value={selectedPayment?.id ?? ""}
                  onValueChange={(id) => setSelectedPayment(payments.find((p) => p.id === id) ?? null)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {pendingPayments.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.member?.name ?? "—"} · {formatAmount(p.amount)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPayment && (
                <div className="rounded-lg bg-muted/30 p-3 text-sm flex flex-col gap-1">
                  <p className="font-medium">{selectedPayment.member?.name}</p>
                  <p className="text-muted-foreground">
                    {selectedPayment.member?.plan} · Monto: {formatAmount(selectedPayment.amount)}
                  </p>
                  <p className="text-muted-foreground">Vence: {formatDate(selectedPayment.dueDate)}</p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <Label>Método de pago</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="transfer">Transferencia</SelectItem>
                    <SelectItem value="app">App</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Referencia (opcional)</Label>
                <Input
                  placeholder="Código de referencia..."
                  value={payReference}
                  onChange={(e) => setPayReference(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label>Notas (opcional)</Label>
                <Textarea
                  placeholder="Notas adicionales..."
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                />
              </div>

              <Separator />
              <Button
                className="w-full gap-2"
                onClick={handleConfirmPayment}
                disabled={!selectedPayment || !payMethod || saving}
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? "Guardando..." : "Confirmar pago"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
