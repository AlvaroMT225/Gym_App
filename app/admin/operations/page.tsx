"use client"

import { useEffect, useState } from "react"
import {
  Users,
  AlertTriangle,
  CreditCard,
  Gift,
  Wrench,
  Clock,
  XCircle,
  Send,
  QrCode,
  ArrowRight,
  MessageSquare,
  Mail,
  Smartphone,
  CheckCheck,
  ShieldCheck,
  BookOpen,
  DollarSign,
  Settings,
  FileText,
  Tag,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
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
import Link from "next/link"

/* ---------- types ---------- */

interface MemberEntry {
  id: string
  name: string
  avatar: string
  phone: string
  endDate: string
  status: string
}

interface OperationsData {
  kpis: {
    alDia: number
    porVencer: number
    vencidos: number
    pagosHoy: number
    promosActivas: number
    incidencias: number
  }
  vencidos: MemberEntry[]
  porVencer: MemberEntry[]
  members: MemberEntry[]
}

interface DashboardKpis {
  miembrosActivos: number
  staffActivo: number
  maquinasRegistradas: number
  ingresosMes: number
  pagosPendientes: number
  pagosVencidos: number
  promosActivas: number
  tutorialesActivos: number
}

/* ---------- constants ---------- */

const defaultMessages: Record<string, string> = {
  vencido:
    "Hola {nombre}, tu membresia ha vencido. Renueva hoy y sigue entrenando sin parar. Te esperamos en Minthy Training!",
  por_vencer:
    "Hola {nombre}, tu membresia vence pronto ({fecha}). Renueva antes para no perder acceso. Te esperamos!",
  todos:
    "Hola {nombre}, te recordamos nuestras promociones activas en Minthy Training. Visitanos para mas informacion!",
}

const channelOptions = [
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "sms", label: "SMS", icon: Smartphone },
  { value: "email", label: "Correo electronico", icon: Mail },
]

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/* ---------- component ---------- */

export default function OperationsPage() {
  const [loading, setLoading] = useState(true)
  const [dashKpis, setDashKpis] = useState<DashboardKpis | null>(null)
  const [opData, setOpData] = useState<OperationsData | null>(null)

  const [reminderOpen, setReminderOpen] = useState(false)
  const [reminderSegment, setReminderSegment] = useState<string>("vencido")
  const [reminderChannel, setReminderChannel] = useState<string>("whatsapp")
  const [reminderMessage, setReminderMessage] = useState(defaultMessages.vencido)
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [sendSuccess, setSendSuccess] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/dashboard").then((r) => (r.ok ? r.json() : null)),
      fetch("/api/admin/operations").then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([dash, ops]) => {
        if (dash) setDashKpis(dash.kpis as DashboardKpis)
        if (ops) setOpData(ops as OperationsData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const members = opData?.members ?? []
  const vencidos = opData?.vencidos ?? []
  const porVencer = opData?.porVencer ?? []

  const recipientsBySegment = (() => {
    if (reminderSegment === "vencido") return members.filter((m) => m.status === "vencido")
    if (reminderSegment === "por_vencer") return members.filter((m) => m.status === "por_vencer")
    return members
  })()

  function handleOpenReminder() {
    setReminderSegment("vencido")
    setReminderChannel("whatsapp")
    setReminderMessage(defaultMessages.vencido)
    setSelectedRecipients(members.filter((m) => m.status === "vencido").map((m) => m.id))
    setSendSuccess(false)
    setReminderOpen(true)
  }

  function handleSegmentChange(val: string) {
    setReminderSegment(val)
    setReminderMessage(defaultMessages[val] || defaultMessages.todos)
    const filtered =
      val === "vencido"
        ? members.filter((m) => m.status === "vencido")
        : val === "por_vencer"
          ? members.filter((m) => m.status === "por_vencer")
          : members
    setSelectedRecipients(filtered.map((m) => m.id))
    setSendSuccess(false)
  }

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    )
  }

  function handleSend() {
    setSendSuccess(true)
  }

  /* ---------- KPI definitions ---------- */

  const kpis = dashKpis ?? {
    miembrosActivos: 0,
    staffActivo: 0,
    maquinasRegistradas: 0,
    ingresosMes: 0,
    pagosPendientes: 0,
    pagosVencidos: 0,
    promosActivas: 0,
    tutorialesActivos: 0,
  }

  const primaryKpis = [
    {
      label: "Miembros activos",
      value: kpis.miembrosActivos,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/members",
    },
    {
      label: "Ingresos del mes",
      value: formatCurrency(kpis.ingresosMes),
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
      href: "/admin/billing",
    },
    {
      label: "Máquinas",
      value: kpis.maquinasRegistradas,
      icon: Wrench,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/machines",
    },
    {
      label: "Staff activo",
      value: kpis.staffActivo,
      icon: ShieldCheck,
      color: "text-accent",
      bg: "bg-accent/15",
      href: "/admin/staff",
    },
  ]

  const secondaryKpis = [
    {
      label: "Pagos pendientes",
      value: kpis.pagosPendientes,
      icon: CreditCard,
      color: "text-accent",
      bg: "bg-accent/15",
      href: "/admin/billing",
    },
    {
      label: "Pagos vencidos",
      value: kpis.pagosVencidos,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10",
      href: "/admin/billing",
    },
    {
      label: "Promos activas",
      value: kpis.promosActivas,
      icon: Gift,
      color: "text-success",
      bg: "bg-success/10",
      href: "/admin/promos",
    },
    {
      label: "Tutoriales",
      value: kpis.tutorialesActivos,
      icon: BookOpen,
      color: "text-primary",
      bg: "bg-primary/10",
      href: "/admin/content",
    },
  ]

  /* ---------- quick access ---------- */

  const quickAccess = [
    { label: "Miembros", href: "/admin/members", icon: Users },
    { label: "Pagos", href: "/admin/billing", icon: CreditCard },
    { label: "Máquinas", href: "/admin/machines", icon: QrCode },
    { label: "Staff", href: "/admin/staff", icon: ShieldCheck },
    { label: "Promos", href: "/admin/promos", icon: Tag },
    { label: "Contenido", href: "/admin/content", icon: FileText },
    { label: "Ajustes", href: "/admin/settings", icon: Settings },
  ]

  /* ---------- render ---------- */

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground text-balance">Panel de Operacion</h1>
        <p className="text-sm text-muted-foreground mt-1">Vista general del estado del gimnasio</p>
      </div>

      {/* ── KPI Cards row 1 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-border">
                <CardContent className="flex items-center gap-3 py-4">
                  <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-6 w-12" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </CardContent>
              </Card>
            ))
          : primaryKpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href}>
                <Card className="border border-border hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-lg ${kpi.bg} shrink-0`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* ── KPI Cards row 2 ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border border-border">
                <CardContent className="flex items-center gap-3 py-4">
                  <Skeleton className="w-11 h-11 rounded-lg shrink-0" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-6 w-8" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))
          : secondaryKpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href}>
                <Card className="border border-border hover:shadow-md transition-all duration-200 cursor-pointer h-full">
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className={`flex items-center justify-center w-11 h-11 rounded-lg ${kpi.bg} shrink-0`}>
                      <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground">{kpi.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
      </div>

      {/* ── Accesos rápidos ── */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {quickAccess.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="outline"
                className="w-full h-auto py-3 flex flex-col items-center gap-1.5"
              >
                <item.icon className="w-4 h-4 text-primary" />
                <span className="text-[11px] font-medium">{item.label}</span>
              </Button>
            </Link>
          ))}
          <Button
            variant="outline"
            className="h-auto py-3 flex flex-col items-center gap-1.5"
            onClick={handleOpenReminder}
            disabled={loading}
          >
            <Send className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-medium">Avisos</span>
          </Button>
        </div>
      </div>

      {/* ── Send Reminders Sheet ── */}
      <Sheet open={reminderOpen} onOpenChange={setReminderOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" />
              Enviar recordatorios
            </SheetTitle>
          </SheetHeader>

          {sendSuccess ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCheck className="w-8 h-8 text-success" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-foreground">Recordatorios enviados</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Se enviaron {selectedRecipients.length} mensaje(s) por{" "}
                  {channelOptions.find((c) => c.value === reminderChannel)?.label}.
                </p>
              </div>
              <Button variant="outline" onClick={() => setReminderOpen(false)} className="mt-4">
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              {/* Segment selector */}
              <div className="flex flex-col gap-2">
                <Label>Destinatarios</Label>
                <Select value={reminderSegment} onValueChange={handleSegmentChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vencido">
                      Miembros vencidos ({members.filter((m) => m.status === "vencido").length})
                    </SelectItem>
                    <SelectItem value="por_vencer">
                      Por vencer ({members.filter((m) => m.status === "por_vencer").length})
                    </SelectItem>
                    <SelectItem value="todos">
                      Todos los miembros ({members.length})
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Channel selector */}
              <div className="flex flex-col gap-2">
                <Label>Canal de envio</Label>
                <div className="grid grid-cols-3 gap-2">
                  {channelOptions.map((ch) => (
                    <Button
                      key={ch.value}
                      variant={reminderChannel === ch.value ? "default" : "outline"}
                      className="h-auto py-3 flex flex-col items-center gap-1.5"
                      onClick={() => setReminderChannel(ch.value)}
                    >
                      <ch.icon className="w-4 h-4" />
                      <span className="text-xs">{ch.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-2">
                <Label>Mensaje</Label>
                <Textarea
                  rows={4}
                  value={reminderMessage}
                  onChange={(e) => setReminderMessage(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  {"Usa {nombre} para personalizar con el nombre del miembro y {fecha} para la fecha de vencimiento."}
                </p>
              </div>

              <Separator />

              {/* Recipient list */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <Label>
                    Seleccionar miembros ({selectedRecipients.length}/{recipientsBySegment.length})
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      if (selectedRecipients.length === recipientsBySegment.length) {
                        setSelectedRecipients([])
                      } else {
                        setSelectedRecipients(recipientsBySegment.map((m) => m.id))
                      }
                    }}
                  >
                    {selectedRecipients.length === recipientsBySegment.length
                      ? "Deseleccionar"
                      : "Seleccionar"}{" "}
                    todos
                  </Button>
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border">
                  {recipientsBySegment.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-muted-foreground text-center">
                      Sin miembros en este segmento.
                    </p>
                  ) : (
                    recipientsBySegment.map((m) => (
                      <label
                        key={m.id}
                        className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 cursor-pointer border-b border-border last:border-0"
                      >
                        <Checkbox
                          checked={selectedRecipients.includes(m.id)}
                          onCheckedChange={() => toggleRecipient(m.id)}
                        />
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                          {m.avatar}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{m.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{m.phone}</p>
                        </div>
                        <Badge
                          className={
                            m.status === "vencido"
                              ? "bg-destructive/10 text-destructive border-0 text-xs"
                              : m.status === "por_vencer"
                                ? "bg-accent/15 text-accent border-0 text-xs"
                                : "bg-success/10 text-success border-0 text-xs"
                          }
                        >
                          {m.status === "vencido"
                            ? "Vencido"
                            : m.status === "por_vencer"
                              ? "Por vencer"
                              : "Al dia"}
                        </Badge>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Preview */}
              <div className="flex flex-col gap-2">
                <Label>Vista previa</Label>
                <div className="rounded-lg bg-muted/40 border border-border p-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    {reminderMessage
                      .replace("{nombre}", recipientsBySegment[0]?.name || "Miembro")
                      .replace("{fecha}", recipientsBySegment[0]?.endDate || "pronto")}
                  </p>
                </div>
              </div>

              <Separator />

              <Button
                className="w-full gap-2"
                onClick={handleSend}
                disabled={selectedRecipients.length === 0}
              >
                <Send className="w-4 h-4" />
                Enviar a {selectedRecipients.length} miembro(s)
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Alert Lists ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Vencidos */}
        <Card className="border border-destructive/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Miembros vencidos
              {loading ? (
                <Skeleton className="ml-auto h-5 w-6" />
              ) : (
                <Badge variant="destructive" className="ml-auto text-xs">
                  {vencidos.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 flex flex-col gap-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : vencidos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin miembros vencidos</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {vencidos.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-destructive/10 text-destructive text-xs font-bold">
                        {m.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">Vencio: {m.endDate}</p>
                      </div>
                    </div>
                    <Link href={`/admin/members?selected=${m.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Por vencer */}
        <Card className="border border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Por vencer
              {loading ? (
                <Skeleton className="ml-auto h-5 w-6" />
              ) : (
                <Badge className="ml-auto text-xs bg-accent/15 text-accent border-0">
                  {porVencer.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="flex-1 flex flex-col gap-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : porVencer.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin miembros por vencer</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {porVencer.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-border last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/15 text-accent text-xs font-bold">
                        {m.avatar}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">Vence: {m.endDate}</p>
                      </div>
                    </div>
                    <Link href={`/admin/members?selected=${m.id}`}>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
