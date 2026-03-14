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
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

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

const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
}

// Ensure we always work with all 7 days even if some are missing from DB
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

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)

  // Info form
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

  // Schedules form
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [schedulesSaving, setSchedulesSaving] = useState(false)
  const [schedulesSaved, setSchedulesSaved] = useState(false)

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

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

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
      </div>
    </div>
  )
}
