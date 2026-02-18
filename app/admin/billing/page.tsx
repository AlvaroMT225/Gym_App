"use client"

import { useState, useMemo } from "react"
import {
  CreditCard,
  Search,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  DollarSign,
  Plus,
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { adminMembers, adminPayments, type AdminMember } from "@/lib/admin-data"

const statusConfig = {
  al_dia: { label: "Al dia", icon: CheckCircle, color: "text-success", bg: "bg-success/10", badgeClass: "bg-success/10 text-success border-0" },
  por_vencer: { label: "Por vencer", icon: Clock, color: "text-accent", bg: "bg-accent/15", badgeClass: "bg-accent/15 text-accent border-0" },
  vencido: { label: "Vencido", icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", badgeClass: "bg-destructive/10 text-destructive border-0" },
}

export default function BillingPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [registerOpen, setRegisterOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null)

  const filtered = useMemo(() => {
    return adminMembers.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "todos" || m.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [search, statusFilter])

  const counts = {
    al_dia: adminMembers.filter((m) => m.status === "al_dia").length,
    por_vencer: adminMembers.filter((m) => m.status === "por_vencer").length,
    vencido: adminMembers.filter((m) => m.status === "vencido").length,
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Pagos & Cobranza</h1>
          <p className="text-sm text-muted-foreground mt-1">Gestion de pagos de miembros</p>
        </div>
        <Button onClick={() => setRegisterOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Registrar pago
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["al_dia", "por_vencer", "vencido"] as const).map((status) => {
          const cfg = statusConfig[status]
          return (
            <Card
              key={status}
              className={`border border-border cursor-pointer transition-all duration-200 hover:shadow-md ${statusFilter === status ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === status ? "todos" : status)}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${cfg.bg}`}>
                  <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{counts[status]}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar miembro..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Member Payment List */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {filtered.map((m) => {
            const cfg = statusConfig[m.status]
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {m.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.plan} - Vence: {m.nextPayment}
                  </p>
                </div>
                <Badge className={cfg.badgeClass + " shrink-0 hidden sm:flex"}>
                  {cfg.label}
                </Badge>
                <div className="flex items-center gap-1 shrink-0">
                  {m.status !== "al_dia" && (
                    <Button variant="ghost" size="sm" title="Enviar recordatorio">
                      <Send className="w-4 h-4 text-primary" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    title="Registrar pago"
                    onClick={() => { setSelectedMember(m); setRegisterOpen(true) }}
                  >
                    <DollarSign className="w-4 h-4 text-success" />
                  </Button>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CreditCard className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Sin resultados</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Payments */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Pagos recientes
        </h2>
        <Card className="border border-border">
          <CardContent className="p-0">
            {adminPayments.slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{p.memberName}</p>
                    <p className="text-xs text-muted-foreground">{p.date} | {p.method} | Ref: {p.reference}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${p.amount}</p>
                  <p className="text-xs text-muted-foreground">{p.registeredBy}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Register Payment Sheet */}
      <Sheet open={registerOpen} onOpenChange={setRegisterOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar Pago</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Miembro</Label>
              <Select defaultValue={selectedMember?.id || ""}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar miembro" />
                </SelectTrigger>
                <SelectContent>
                  {adminMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Monto ($)</Label>
              <Input type="number" placeholder="0.00" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Metodo de pago</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar metodo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tarjeta">Tarjeta</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Referencia / Nota</Label>
              <Textarea placeholder="Numero de referencia o notas..." />
            </div>
            <Separator />
            <Button className="w-full gap-2">
              <CheckCircle className="w-4 h-4" />
              Confirmar pago
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
