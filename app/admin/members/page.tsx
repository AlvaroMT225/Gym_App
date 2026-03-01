"use client"

import { useState, useMemo, useEffect } from "react"
import {
  Search,
  Users,
  Calendar,
  Phone,
  Mail,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
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
import { Separator } from "@/components/ui/separator"

/* ---------- types ---------- */

interface Member {
  id: string
  name: string
  email: string
  phone: string
  avatar: string
  plan: string
  planType: string
  status: "al_dia" | "por_vencer" | "vencido"
  memberSince: string
  nextPayment: string
  notes: string
}

interface PaymentEntry {
  id: string
  amount: number
  status: string
  date: string
  method: string
  reference: string
  notes: string
}

interface MemberDetail {
  member: Member
  paymentHistory: PaymentEntry[]
}

/* ---------- constants ---------- */

const statusConfig = {
  al_dia: { label: "Al dia", class: "bg-success/10 text-success border-0" },
  por_vencer: { label: "Por vencer", class: "bg-accent/15 text-accent border-0" },
  vencido: { label: "Vencido", class: "bg-destructive/10 text-destructive border-0" },
}

/* ---------- component ---------- */

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<Member | null>(null)
  const [detail, setDetail] = useState<MemberDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [planFilter, setPlanFilter] = useState<string>("todos")

  // Load member list
  useEffect(() => {
    fetch("/api/admin/members")
      .then((r) => (r.ok ? r.json() : { members: [], total: 0 }))
      .then((d) => {
        setMembers(d.members ?? [])
        setTotal(d.total ?? 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Lazy-load detail when a member is selected
  function handleSelectMember(m: Member) {
    setSelected(m)
    setDetail(null)
    setDetailLoading(true)
    fetch(`/api/admin/members/${m.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setDetail(d) })
      .catch(() => {})
      .finally(() => setDetailLoading(false))
  }

  function handleCloseSheet() {
    setSelected(null)
    setDetail(null)
  }

  // Client-side filter on loaded data
  const plans = useMemo(() => [...new Set(members.map((m) => m.plan))], [members])

  const filtered = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.email.toLowerCase().includes(search.toLowerCase())
      const matchesStatus = statusFilter === "todos" || m.status === statusFilter
      const matchesPlan = planFilter === "todos" || m.plan === planFilter
      return matchesSearch && matchesStatus && matchesPlan
    })
  }, [members, search, statusFilter, planFilter])

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Miembros</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "Cargando..." : `${total} miembros registrados`}
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="al_dia">Al dia</SelectItem>
            <SelectItem value="por_vencer">Por vencer</SelectItem>
            <SelectItem value="vencido">Vencido</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los planes</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Members Table / List */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col gap-0">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0">
                  <div className="w-8 h-8 rounded-full bg-muted animate-pulse shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-muted animate-pulse rounded w-1/3" />
                    <div className="h-3 bg-muted animate-pulse rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Miembro</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Vencimiento</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Estado</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Accion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors cursor-pointer"
                        onClick={() => handleSelectMember(m)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                              {m.avatar}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{m.name}</p>
                              <p className="text-xs text-muted-foreground">{m.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-foreground">{m.plan}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{m.nextPayment}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusConfig[m.status]?.class ?? statusConfig.vencido.class}>
                            {statusConfig[m.status]?.label ?? "Vencido"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleSelectMember(m) }}
                          >
                            Ver ficha
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile list */}
              <div className="md:hidden">
                {filtered.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => handleSelectMember(m)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleSelectMember(m)}
                  >
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {m.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.plan} - {m.nextPayment}</p>
                    </div>
                    <Badge className={(statusConfig[m.status]?.class ?? statusConfig.vencido.class) + " shrink-0"}>
                      {statusConfig[m.status]?.label ?? "Vencido"}
                    </Badge>
                  </div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Users className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-sm">No se encontraron miembros</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Member Detail Sheet */}
      <Sheet open={!!selected} onOpenChange={handleCloseSheet}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-sm font-bold">
                    {selected.avatar}
                  </div>
                  <div>
                    <p className="text-foreground">{selected.name}</p>
                    <Badge className={(statusConfig[selected.status]?.class ?? statusConfig.vencido.class) + " mt-1"}>
                      {statusConfig[selected.status]?.label ?? "Vencido"}
                    </Badge>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 flex flex-col gap-5">
                {/* Contact Info */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacto</h3>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    {selected.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    {selected.phone || "Sin teléfono"}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Miembro desde: {selected.memberSince ? new Date(selected.memberSince).toLocaleDateString("es-ES") : "—"}
                  </div>
                </div>

                <Separator />

                {/* Plan Details */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="border border-border">
                      <CardContent className="py-3">
                        <p className="text-xs text-muted-foreground">Plan actual</p>
                        <p className="text-sm font-semibold text-foreground">{selected.plan}</p>
                      </CardContent>
                    </Card>
                    <Card className="border border-border">
                      <CardContent className="py-3">
                        <p className="text-xs text-muted-foreground">Vencimiento</p>
                        <p className="text-sm font-semibold text-foreground">{selected.nextPayment || "—"}</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Payment History (lazy-loaded) */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Historial de pagos</h3>
                  {detailLoading ? (
                    <div className="space-y-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-10 rounded bg-muted animate-pulse" />
                      ))}
                    </div>
                  ) : !detail || detail.paymentHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sin pagos registrados</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {detail.paymentHistory.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div>
                            <p className="text-sm text-foreground">
                              ${p.amount} - {p.method || "—"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.date ? new Date(p.date).toLocaleDateString("es-ES") : "—"}
                              {p.reference ? ` | Ref: ${p.reference}` : ""}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Notes */}
                <div className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas</h3>
                  <p className="text-sm text-foreground">
                    {selected.notes || "Sin notas"}
                  </p>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
