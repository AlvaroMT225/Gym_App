"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  Gift,
  Plus,
  Tag,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  BarChart3,
  Pencil,
  Copy,
  Check,
  Power,
  Trash2,
  Search,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
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
import { Skeleton } from "@/components/ui/skeleton"

/* ---------- constants ---------- */

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Porcentaje (%)" },
  { value: "fixed",      label: "Monto fijo ($)" },
]

const PLAN_OPTIONS = [
  { value: "basic",   label: "Básico" },
  { value: "premium", label: "Premium" },
  { value: "vip",     label: "VIP" },
  { value: "custom",  label: "Personalizado" },
]

const STATUS_OPTIONS = [
  { value: "active",   label: "Activa" },
  { value: "inactive", label: "Inactiva" },
  { value: "expired",  label: "Expirada" },
]

const statusConfig: Record<string, { label: string; badgeClass: string; icon: React.ElementType }> = {
  active:   { label: "Activa",    badgeClass: "bg-success/10 text-success border-0",            icon: CheckCircle },
  inactive: { label: "Inactiva",  badgeClass: "bg-accent/15 text-accent border-0",              icon: Clock },
  expired:  { label: "Expirada",  badgeClass: "bg-muted text-muted-foreground border-0",        icon: XCircle },
}

/* ---------- interfaces ---------- */

interface Promo {
  id: string
  title: string
  description: string | null
  discountType: string
  discountTypeLabel: string
  discountValue: number
  code: string | null
  status: string
  statusLabel: string
  startsAt: string | null
  expiresAt: string | null
  maxUses: number | null
  usesCount: number
  minPlanType: string | null
  minPlanLabel: string | null
  createdAt: string
}

interface Kpis {
  total: number
  activas: number
  expiradas: number
  totalRedenciones: number
}

interface CreateForm {
  title: string
  description: string
  discountType: string
  discountValue: string
  code: string
  startsAt: string
  expiresAt: string
  maxUses: string
  minPlanType: string
  status: string
}

interface EditForm {
  title: string
  description: string
  discountValue: string
  code: string
  status: string
  startsAt: string
  expiresAt: string
  maxUses: string
  minPlanType: string
}

const EMPTY_CREATE: CreateForm = {
  title: "", description: "", discountType: "percentage", discountValue: "",
  code: "", startsAt: "", expiresAt: "", maxUses: "", minPlanType: "", status: "active",
}

/* ---------- helpers ---------- */

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
}

function formatDiscount(type: string, value: number) {
  return type === "percentage" ? `${value}%` : `$${value.toFixed(2)}`
}

function toDateInput(isoStr: string | null): string {
  if (!isoStr) return ""
  return isoStr.split("T")[0]
}

/* ---------- page ---------- */

export default function PromosPage() {
  const [promotions, setPromotions] = useState<Promo[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")

  // copied code state: promoId → boolean
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [createSaving, setCreateSaving] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    title: "", description: "", discountValue: "", code: "",
    status: "active", startsAt: "", expiresAt: "", maxUses: "", minPlanType: "",
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  /* ---------- load ---------- */

  const loadPromos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/promotions")
      if (!res.ok) return
      const data = await res.json()
      setPromotions(data.promotions ?? [])
      setKpis(data.kpis ?? null)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPromos() }, [loadPromos])

  /* ---------- filter ---------- */

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return promotions.filter((p) => {
      const matchSearch =
        p.title.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.description ?? "").toLowerCase().includes(q)
      const matchStatus = statusFilter === "todos" || p.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [promotions, search, statusFilter])

  /* ---------- create ---------- */

  function openCreate() {
    setCreateForm(EMPTY_CREATE)
    setCreateSuccess(false)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!createForm.title.trim() || !createForm.discountValue) return
    setCreateSaving(true)
    try {
      const res = await fetch("/api/admin/promotions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:         createForm.title,
          description:   createForm.description || undefined,
          discountType:  createForm.discountType,
          discountValue: Number(createForm.discountValue),
          code:          createForm.code || undefined,
          startsAt:      createForm.startsAt || undefined,
          expiresAt:     createForm.expiresAt || undefined,
          maxUses:       createForm.maxUses ? Number(createForm.maxUses) : undefined,
          minPlanType:   createForm.minPlanType || undefined,
          status:        createForm.status,
        }),
      })
      if (!res.ok) return
      setCreateSuccess(true)
      await loadPromos()
    } catch {
      // silently fail
    } finally {
      setCreateSaving(false)
    }
  }

  /* ---------- edit ---------- */

  function openEdit(p: Promo) {
    setEditId(p.id)
    setEditForm({
      title:         p.title,
      description:   p.description ?? "",
      discountValue: String(p.discountValue),
      code:          p.code ?? "",
      status:        p.status,
      startsAt:      toDateInput(p.startsAt),
      expiresAt:     toDateInput(p.expiresAt),
      maxUses:       p.maxUses != null ? String(p.maxUses) : "",
      minPlanType:   p.minPlanType ?? "",
    })
    setEditSaved(false)
    setEditOpen(true)
  }

  async function handleEdit() {
    if (!editId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/admin/promotions/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:        editForm.title,
          description:  editForm.description || undefined,
          discountValue: Number(editForm.discountValue),
          code:          editForm.code || undefined,
          status:        editForm.status,
          startsAt:      editForm.startsAt || undefined,
          expiresAt:     editForm.expiresAt || undefined,
          maxUses:       editForm.maxUses ? Number(editForm.maxUses) : undefined,
          minPlanType:   editForm.minPlanType || undefined,
        }),
      })
      if (!res.ok) return
      setEditSaved(true)
      await loadPromos()
    } catch {
      // silently fail
    } finally {
      setEditSaving(false)
    }
  }

  /* ---------- toggle active/inactive ---------- */

  async function handleToggleStatus(p: Promo) {
    const newStatus = p.status === "active" ? "inactive" : "active"
    try {
      await fetch(`/api/admin/promotions/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      await loadPromos()
    } catch {
      // silently fail
    }
  }

  /* ---------- copy code ---------- */

  function handleCopyCode(p: Promo) {
    if (!p.code) return
    navigator.clipboard.writeText(p.code)
      .then(() => {
        setCopiedId(p.id)
        setTimeout(() => setCopiedId(null), 2000)
      })
      .catch(() => {})
  }

  /* ---------- render ---------- */

  const activas  = filtered.filter((p) => p.status === "active")
  const inactivas = filtered.filter((p) => p.status === "inactive")
  const expiradas = filtered.filter((p) => p.status === "expired")

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Promos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Cargando..." : `${promotions.length} promociones`}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          Crear promo
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-5 w-8" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card className="border border-border">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/30 shrink-0">
                  <Gift className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "active" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "active" ? "todos" : "active")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.activas ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Activas</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "expired" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "expired" ? "todos" : "expired")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/30 shrink-0">
                  <XCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.expiradas ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Expiradas</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                  <BarChart3 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.totalRedenciones ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Canjes totales</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar título, código..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Promo Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-3 w-56 mt-1" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-3 w-32 mb-2" />
                <Skeleton className="h-3 w-40 mb-4" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 flex-1 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Active */}
          {activas.length > 0 && (
            <PromoSection
              title={`Activas (${activas.length})`}
              promos={activas}
              copiedId={copiedId}
              onCopy={handleCopyCode}
              onEdit={openEdit}
              onToggle={handleToggleStatus}
            />
          )}

          {/* Inactive */}
          {inactivas.length > 0 && (
            <PromoSection
              title={`Inactivas (${inactivas.length})`}
              promos={inactivas}
              copiedId={copiedId}
              onCopy={handleCopyCode}
              onEdit={openEdit}
              onToggle={handleToggleStatus}
              dimmed
            />
          )}

          {/* Expired */}
          {expiradas.length > 0 && (
            <PromoSection
              title={`Expiradas (${expiradas.length})`}
              promos={expiradas}
              copiedId={copiedId}
              onCopy={handleCopyCode}
              onEdit={openEdit}
              onToggle={handleToggleStatus}
              dimmed
            />
          )}

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Gift className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm">Sin resultados</p>
            </div>
          )}
        </>
      )}

      {/* ── Create Sheet ── */}
      <Sheet open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setCreateSuccess(false) } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Crear Promo</SheetTitle>
          </SheetHeader>

          {createSuccess ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">¡Promo creada!</p>
              <p className="text-sm text-muted-foreground">La promoción está disponible para los miembros.</p>
              <Button className="mt-2 w-full" onClick={() => { setCreateOpen(false); setCreateSuccess(false) }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Título <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="ej. 20% en Suplementos"
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Descripción de la promo..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Tipo descuento <span className="text-destructive">*</span></Label>
                  <Select
                    value={createForm.discountType}
                    onValueChange={(val) => setCreateForm((p) => ({ ...p, discountType: val }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISCOUNT_TYPE_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Valor <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder={createForm.discountType === "percentage" ? "ej. 20" : "ej. 5.00"}
                    value={createForm.discountValue}
                    onChange={(e) => setCreateForm((p) => ({ ...p, discountValue: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Código de cupón <span className="text-xs text-muted-foreground">(auto si se deja vacío)</span></Label>
                <Input
                  placeholder="ej. MINTHY20"
                  className="font-mono uppercase"
                  value={createForm.code}
                  onChange={(e) => setCreateForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Inicio</Label>
                  <Input
                    type="date"
                    value={createForm.startsAt}
                    onChange={(e) => setCreateForm((p) => ({ ...p, startsAt: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Expiración</Label>
                  <Input
                    type="date"
                    value={createForm.expiresAt}
                    onChange={(e) => setCreateForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Usos máx.</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Sin límite"
                    value={createForm.maxUses}
                    onChange={(e) => setCreateForm((p) => ({ ...p, maxUses: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Plan mínimo</Label>
                  <Select
                    value={createForm.minPlanType || "_none"}
                    onValueChange={(val) => setCreateForm((p) => ({ ...p, minPlanType: val === "_none" ? "" : val }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Todos</SelectItem>
                      {PLAN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado inicial</Label>
                <Select
                  value={createForm.status}
                  onValueChange={(val) => setCreateForm((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Activa</SelectItem>
                    <SelectItem value="inactive">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button
                className="w-full gap-2"
                onClick={handleCreate}
                disabled={!createForm.title.trim() || !createForm.discountValue || createSaving}
              >
                <Plus className="w-4 h-4" />
                {createSaving ? "Creando..." : "Crear promo"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ── Edit Sheet ── */}
      <Sheet open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditSaved(false) } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Promo</SheetTitle>
          </SheetHeader>

          {editSaved ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">Cambios guardados</p>
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditSaved(false) }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Título</Label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Valor del descuento</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.discountValue}
                  onChange={(e) => setEditForm((p) => ({ ...p, discountValue: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Código de cupón</Label>
                <Input
                  className="font-mono uppercase"
                  value={editForm.code}
                  onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Inicio</Label>
                  <Input
                    type="date"
                    value={editForm.startsAt}
                    onChange={(e) => setEditForm((p) => ({ ...p, startsAt: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Expiración</Label>
                  <Input
                    type="date"
                    value={editForm.expiresAt}
                    onChange={(e) => setEditForm((p) => ({ ...p, expiresAt: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label>Usos máx.</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Sin límite"
                    value={editForm.maxUses}
                    onChange={(e) => setEditForm((p) => ({ ...p, maxUses: e.target.value }))}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label>Plan mínimo</Label>
                  <Select
                    value={editForm.minPlanType || "_none"}
                    onValueChange={(val) => setEditForm((p) => ({ ...p, minPlanType: val === "_none" ? "" : val }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Todos</SelectItem>
                      {PLAN_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <Button
                className="w-full gap-2"
                onClick={handleEdit}
                disabled={!editForm.title.trim() || editSaving}
              >
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

/* ---------- PromoSection sub-component ---------- */

interface PromoSectionProps {
  title: string
  promos: Promo[]
  copiedId: string | null
  onCopy: (p: Promo) => void
  onEdit: (p: Promo) => void
  onToggle: (p: Promo) => void
  dimmed?: boolean
}

function PromoSection({ title, promos, copiedId, onCopy, onEdit, onToggle, dimmed }: PromoSectionProps) {
  return (
    <div className="mb-8">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        {title}
      </h2>
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${dimmed ? "opacity-60" : ""}`}>
        {promos.map((promo) => {
          const cfg = statusConfig[promo.status] ?? statusConfig.expired
          const isCopied = copiedId === promo.id
          const canToggle = promo.status === "active" || promo.status === "inactive"

          return (
            <Card key={promo.id} className="border border-border hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                    {promo.title}
                  </CardTitle>
                  <Badge className={`${cfg.badgeClass} shrink-0`}>{cfg.label}</Badge>
                </div>
                {promo.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{promo.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 mb-3">
                  {/* Discount */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Tag className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-semibold text-foreground">
                      {formatDiscount(promo.discountType, promo.discountValue)}
                    </span>
                    <span className="text-muted-foreground">({promo.discountTypeLabel})</span>
                  </div>
                  {/* Code */}
                  {promo.code && (
                    <button
                      className="flex items-center gap-2 text-xs text-muted-foreground w-fit group"
                      onClick={() => onCopy(promo)}
                      title="Copiar código"
                    >
                      <Tag className="w-3.5 h-3.5 shrink-0" />
                      <span className="font-mono font-medium text-foreground group-hover:underline">
                        {promo.code}
                      </span>
                      {isCopied
                        ? <Check className="w-3 h-3 text-success" />
                        : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      }
                    </button>
                  )}
                  {/* Dates */}
                  {(promo.startsAt || promo.expiresAt) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      {formatDate(promo.startsAt) ?? "—"} → {formatDate(promo.expiresAt) ?? "Sin vencimiento"}
                    </div>
                  )}
                  {/* Plan restriction */}
                  {promo.minPlanLabel && (
                    <div className="text-xs text-muted-foreground">
                      Plan mínimo: <span className="text-foreground font-medium">{promo.minPlanLabel}</span>
                    </div>
                  )}
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-3 py-2 px-3 bg-muted/30 rounded-lg mb-3">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-medium text-foreground">{promo.usesCount} canjes</span>
                  </div>
                  {promo.maxUses != null && (
                    <span className="text-xs text-muted-foreground">/ {promo.maxUses} máx.</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => onEdit(promo)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                  {canToggle && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => onToggle(promo)}
                      title={promo.status === "active" ? "Desactivar" : "Activar"}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {promo.status === "active" ? "Desactivar" : "Activar"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
