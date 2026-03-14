"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Settings,
  Clock,
  Save,
  CheckCircle,
  MapPin,
  Phone,
  Mail,
  Globe,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export const dynamic = 'force-dynamic'

/* ─── Plan type labels ─────────────────────────────────────────────────────── */

const PLAN_TYPE_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  annual: "Anual",
}

const PLAN_TYPE_ORDER = ["daily", "weekly", "biweekly", "monthly", "quarterly", "annual"]

/* ─── Interfaces ────────────────────────────────────────────────────────────── */

interface GymInfo {
  id: string
  name: string
  address: string
  city: string
  country: string
  phone: string
  email: string
  logoUrl: string | null
  timezone: string
  settings: Record<string, unknown>
}

interface ScheduleItem {
  id: string
  dayOfWeek: number
  opensAt: string
  closesAt: string
  isClosed: boolean
}

interface SettingsResponse {
  gym: GymInfo
  schedules: ScheduleItem[]
}

interface PlanPrice {
  id: string
  gym_id: string
  plan_type: string
  price: number
  is_active: boolean
  created_at: string
  updated_at: string
}

/* ─── Helpers ───────────────────────────────────────────────────────────────── */

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

function fillSchedules(schedules: ScheduleItem[]): ScheduleItem[] {
  return Array.from({ length: 7 }, (_, i) => {
    const found = schedules.find((s) => s.dayOfWeek === i)
    return (
      found ?? {
        id: "",
        dayOfWeek: i,
        opensAt: "06:00",
        closesAt: "22:00",
        isClosed: i === 0,
      }
    )
  })
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)

  // ── Info form ──
  const [infoForm, setInfoForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    timezone: "",
  })
  const [infoSaving, setInfoSaving] = useState(false)
  const [infoSaved, setInfoSaved] = useState(false)

  // ── Schedules form ──
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [schedulesSaving, setSchedulesSaving] = useState(false)
  const [schedulesSaved, setSchedulesSaved] = useState(false)

  // ── Plan prices ──
  const [planPrices, setPlanPrices] = useState<PlanPrice[]>([])
  const [planPricesLoading, setPlanPricesLoading] = useState(true)

  // Edit sheet
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [editingPrice, setEditingPrice] = useState<PlanPrice | null>(null)
  const [editPrice, setEditPrice] = useState("")
  const [editIsActive, setEditIsActive] = useState(true)
  const [editSaving, setEditSaving] = useState(false)

  // Create sheet
  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [createPlanType, setCreatePlanType] = useState("")
  const [createPrice, setCreatePrice] = useState("")
  const [createSaving, setCreateSaving] = useState(false)

  /* ── Loaders ── */

  const loadSettings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/settings")
      if (!res.ok) return
      const data = (await res.json()) as SettingsResponse

      const gym = data.gym
      setInfoForm({
        name: gym.name,
        address: gym.address,
        city: gym.city,
        phone: gym.phone,
        email: gym.email,
        timezone: gym.timezone,
      })
      setSchedules(fillSchedules(data.schedules ?? []))
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  const loadPlanPrices = useCallback(async () => {
    setPlanPricesLoading(true)
    try {
      const res = await fetch("/api/admin/plan-prices")
      if (!res.ok) return
      const json = (await res.json()) as { data: PlanPrice[] }
      const sorted = (json.data ?? []).sort(
        (a, b) => PLAN_TYPE_ORDER.indexOf(a.plan_type) - PLAN_TYPE_ORDER.indexOf(b.plan_type)
      )
      setPlanPrices(sorted)
    } catch {
      // silently fail
    } finally {
      setPlanPricesLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
    loadPlanPrices()
  }, [loadSettings, loadPlanPrices])

  /* ── Info handlers ── */

  async function handleSaveInfo() {
    if (!infoForm.name.trim()) return
    setInfoSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "info", data: infoForm }),
      })
      if (!res.ok) return
      setInfoSaved(true)
      setTimeout(() => setInfoSaved(false), 3000)
    } catch {
      // silently fail
    } finally {
      setInfoSaving(false)
    }
  }

  /* ── Schedules handlers ── */

  async function handleSaveSchedules() {
    setSchedulesSaving(true)
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "schedules", data: { schedules } }),
      })
      if (!res.ok) return
      setSchedulesSaved(true)
      setTimeout(() => setSchedulesSaved(false), 3000)
    } catch {
      // silently fail
    } finally {
      setSchedulesSaving(false)
    }
  }

  function updateSchedule(dayOfWeek: number, field: keyof ScheduleItem, value: unknown) {
    setSchedules((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    )
  }

  /* ── Plan price handlers ── */

  function openEdit(plan: PlanPrice) {
    setEditingPrice(plan)
    setEditPrice(String(plan.price))
    setEditIsActive(plan.is_active)
    setEditSheetOpen(true)
  }

  async function handleSaveEdit() {
    if (!editingPrice) return
    const price = parseFloat(editPrice)
    if (isNaN(price) || price <= 0) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/admin/plan-prices/${editingPrice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, is_active: editIsActive }),
      })
      if (!res.ok) return
      const json = (await res.json()) as { data: PlanPrice }
      setPlanPrices((prev) =>
        prev.map((p) => (p.id === editingPrice.id ? json.data : p))
      )
      setEditSheetOpen(false)
    } catch {
      // silently fail
    } finally {
      setEditSaving(false)
    }
  }

  async function handleCreate() {
    const price = parseFloat(createPrice)
    if (!createPlanType || isNaN(price) || price <= 0) return
    setCreateSaving(true)
    try {
      const res = await fetch("/api/admin/plan-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_type: createPlanType, price }),
      })
      if (!res.ok) return
      setCreateSheetOpen(false)
      setCreatePlanType("")
      setCreatePrice("")
      await loadPlanPrices()
    } catch {
      // silently fail
    } finally {
      setCreateSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/admin/plan-prices/${id}`, { method: "DELETE" })
      setPlanPrices((prev) => prev.filter((p) => p.id !== id))
    } catch {
      // silently fail
    }
  }

  const existingPlanTypes = planPrices.map((p) => p.plan_type)
  const availablePlanTypes = PLAN_TYPE_ORDER.filter((pt) => !existingPlanTypes.includes(pt))

  /* ─────────────────────────────── JSX ─────────────────────────────────────── */

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">Configuración general del gimnasio</p>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">

        {/* ── Información del Gimnasio ── */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Información del Gimnasio
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading ? (
              <>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-9 w-full" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <div className="flex flex-col gap-2">
                  <Label>Nombre del gimnasio *</Label>
                  <Input
                    value={infoForm.name}
                    onChange={(e) => setInfoForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="ej. Minthy Fitness"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Dirección
                    </Label>
                    <Input
                      value={infoForm.address}
                      onChange={(e) => setInfoForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Av. Principal 123"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      Ciudad
                    </Label>
                    <Input
                      value={infoForm.city}
                      onChange={(e) => setInfoForm((p) => ({ ...p, city: e.target.value }))}
                      placeholder="Loja"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      Teléfono
                    </Label>
                    <Input
                      value={infoForm.phone}
                      onChange={(e) => setInfoForm((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="+593 7 123 4567"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Label className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      Email
                    </Label>
                    <Input
                      type="email"
                      value={infoForm.email}
                      onChange={(e) => setInfoForm((p) => ({ ...p, email: e.target.value }))}
                      placeholder="gym@ejemplo.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <Label className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Zona horaria
                  </Label>
                  <Input
                    value={infoForm.timezone}
                    onChange={(e) => setInfoForm((p) => ({ ...p, timezone: e.target.value }))}
                    placeholder="America/Guayaquil"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-end gap-3">
                  {infoSaved && (
                    <span className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Guardado
                    </span>
                  )}
                  <Button
                    className="gap-2"
                    onClick={handleSaveInfo}
                    disabled={!infoForm.name.trim() || infoSaving}
                  >
                    <Save className="w-4 h-4" />
                    {infoSaving ? "Guardando..." : "Guardar información"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Horarios de Operación ── */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Horarios de Operación
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {loading ? (
              <>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-4 w-24 shrink-0" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-9 w-28" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                ))}
              </>
            ) : (
              <>
                {schedules.map((s) => (
                  <div key={s.dayOfWeek} className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-sm w-24 shrink-0 ${
                        s.isClosed ? "text-muted-foreground/50" : "text-foreground"
                      }`}
                    >
                      {DAY_NAMES[s.dayOfWeek]}
                    </span>
                    <Input
                      type="time"
                      value={s.opensAt}
                      onChange={(e) => updateSchedule(s.dayOfWeek, "opensAt", e.target.value)}
                      className="w-28"
                      disabled={s.isClosed}
                    />
                    <span className="text-xs text-muted-foreground">a</span>
                    <Input
                      type="time"
                      value={s.closesAt}
                      onChange={(e) => updateSchedule(s.dayOfWeek, "closesAt", e.target.value)}
                      className="w-28"
                      disabled={s.isClosed}
                    />
                    <button
                      type="button"
                      onClick={() => updateSchedule(s.dayOfWeek, "isClosed", !s.isClosed)}
                      className={`text-xs px-2 py-1 rounded-md border transition-colors shrink-0 ${
                        s.isClosed
                          ? "border-destructive/50 text-destructive bg-destructive/5 hover:bg-destructive/10"
                          : "border-border text-muted-foreground hover:bg-muted/30"
                      }`}
                    >
                      {s.isClosed ? "Cerrado" : "Abierto"}
                    </button>
                  </div>
                ))}

                <Separator className="mt-1" />

                <div className="flex items-center justify-end gap-3">
                  {schedulesSaved && (
                    <span className="flex items-center gap-1.5 text-xs text-success">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Guardado
                    </span>
                  )}
                  <Button
                    className="gap-2"
                    onClick={handleSaveSchedules}
                    disabled={schedulesSaving}
                  >
                    <Save className="w-4 h-4" />
                    {schedulesSaving ? "Guardando..." : "Guardar horarios"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Planes de Pago ── */}
        <Card className="border border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-primary" />
                Planes de Pago
              </CardTitle>
              {!planPricesLoading && availablePlanTypes.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 text-xs"
                  onClick={() => {
                    setCreatePlanType("")
                    setCreatePrice("")
                    setCreateSheetOpen(true)
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Agregar Plan
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-0">
            {planPricesLoading ? (
              <div className="flex flex-col gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between py-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : planPrices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay planes configurados.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {planPrices.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-center justify-between py-3 gap-3 flex-wrap"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-foreground w-24 shrink-0">
                        {PLAN_TYPE_LABELS[plan.plan_type] ?? plan.plan_type}
                      </span>
                      <span className="text-sm text-foreground font-mono">
                        ${Number(plan.price).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={plan.is_active ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {plan.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(plan)}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Se eliminará el plan{" "}
                              <strong>
                                {PLAN_TYPE_LABELS[plan.plan_type] ?? plan.plan_type}
                              </strong>{" "}
                              (${Number(plan.price).toFixed(2)}). Esta acción no se puede deshacer.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive hover:bg-destructive/90"
                              onClick={() => handleDelete(plan.id)}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Edit Sheet ── */}
      <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              Editar Plan:{" "}
              {editingPrice ? (PLAN_TYPE_LABELS[editingPrice.plan_type] ?? editingPrice.plan_type) : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-5 mt-6">
            <div className="flex flex-col gap-2">
              <Label>Precio ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={editPrice}
                onChange={(e) => setEditPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Estado activo</Label>
              <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
            </div>
            <Separator />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setEditSheetOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={editSaving || !editPrice || parseFloat(editPrice) <= 0}
              >
                {editSaving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Create Sheet ── */}
      <Sheet open={createSheetOpen} onOpenChange={setCreateSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Agregar Plan de Pago</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-5 mt-6">
            <div className="flex flex-col gap-2">
              <Label>Período</Label>
              <Select value={createPlanType} onValueChange={setCreatePlanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un período" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlanTypes.map((pt) => (
                    <SelectItem key={pt} value={pt}>
                      {PLAN_TYPE_LABELS[pt] ?? pt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Precio ($)</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={createPrice}
                onChange={(e) => setCreatePrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Separator />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreateSheetOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreate}
                disabled={
                  createSaving ||
                  !createPlanType ||
                  !createPrice ||
                  parseFloat(createPrice) <= 0
                }
              >
                {createSaving ? "Creando..." : "Crear"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
