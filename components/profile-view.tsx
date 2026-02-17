"use client"

import { useState, useEffect, useCallback } from "react"
import {
  User,
  Mail,
  Dumbbell,
  Shield,
  Settings,
  Flame,
  Zap,
  Pencil,
  Check,
  X,
  LogOut,
  UserCheck,
  Plus,
  Trash2,
  PencilLine,
  CalendarIcon,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Phone,
  GraduationCap,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useStore } from "@/lib/store"
import { useAuth } from "@/lib/auth/auth-context"
import { formatDateLong, formatNumber } from "@/lib/utils"
import { coachDirectory } from "@/lib/mock-data"

const ALL_SCOPES = [
  { id: "sessions:read", label: "Sesiones" },
  { id: "sessions:comment", label: "Comentarios en sesiones" },
  { id: "sessions:write", label: "Crear sesiones sugeridas" },
  { id: "routines:read", label: "Rutinas (lectura)" },
  { id: "routines:write", label: "Rutinas (escritura)" },
  { id: "exercises:read", label: "Ejercicios" },
  { id: "progress:read", label: "Progreso" },
  { id: "prs:read", label: "Records personales" },
  { id: "achievements:read", label: "Logros" },
  { id: "goals:write", label: "Objetivos" },
]

const DURATION_OPTIONS = [
  { value: "7", label: "1 semana" },
  { value: "14", label: "2 semanas" },
  { value: "30", label: "1 mes" },
  { value: "90", label: "3 meses" },
  { value: "none", label: "Sin vencimiento" },
  { value: "custom", label: "Hasta fecha especifica" },
]

interface ConsentEntry {
  id: string
  status: string
  scopes: string[]
  expires_at: string | null
  created_at: string
  trainer: { id: string; name: string; avatar: string } | null
  hidden_by_client?: boolean
}

interface TrainerOption {
  id: string
  name: string
  avatar: string
}

export function ProfileView() {
  const { user, weightUnit, setWeightUnit, optedInRankings, toggleRankingsOptIn, updateUser } =
    useStore()
  const { user: authUser, logout } = useAuth()

  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(user.name)
  const [editEmail, setEditEmail] = useState(user.email)
  const [saved, setSaved] = useState(false)

  // Consent state (USER only)
  const [consents, setConsents] = useState<ConsentEntry[]>([])
  const [trainers, setTrainers] = useState<TrainerOption[]>([])
  const [consentLoading, setConsentLoading] = useState(false)
  const [newConsentOpen, setNewConsentOpen] = useState(false)
  const [editConsentOpen, setEditConsentOpen] = useState(false)
  const [editConsentId, setEditConsentId] = useState("")
  const [selectedTrainer, setSelectedTrainer] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>([])
  const [selectedDuration, setSelectedDuration] = useState("30")
  const [consentError, setConsentError] = useState("")
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined)
  const [showHidden, setShowHidden] = useState(false)

  const loadConsents = useCallback(async () => {
    if (authUser?.role !== "USER") return
    setConsentLoading(true)
    try {
      const [consentsRes, trainersRes] = await Promise.all([
        fetch("/api/consents"),
        fetch("/api/trainers"),
      ])
      if (consentsRes.ok) {
        const data = await consentsRes.json()
        setConsents(data.consents || [])
      }
      if (trainersRes.ok) {
        const data = await trainersRes.json()
        setTrainers(data.trainers || [])
      }
    } catch {
      // ignore
    } finally {
      setConsentLoading(false)
    }
  }, [authUser?.role])

  useEffect(() => {
    loadConsents()
  }, [loadConsents])

  const computeExpiresAt = () => {
    if (selectedDuration === "none") return null
    if (selectedDuration === "custom") {
      if (!customDate) return null
      const d = new Date(customDate)
      d.setHours(23, 59, 59, 0)
      return d.toISOString()
    }
    return new Date(Date.now() + Number(selectedDuration) * 24 * 60 * 60 * 1000).toISOString()
  }

  const handleCreateConsent = async () => {
    setConsentError("")
    if (!selectedTrainer || selectedScopes.length === 0) {
      setConsentError("Selecciona un entrenador y al menos un permiso.")
      return
    }
    if (selectedDuration === "custom" && !customDate) {
      setConsentError("Selecciona una fecha de vencimiento.")
      return
    }
    const expiresAt = computeExpiresAt()
    try {
      const res = await fetch("/api/consents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerId: selectedTrainer,
          scopes: selectedScopes,
          expiresAt,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setConsentError(data.error || "Error al crear consentimiento")
        return
      }
      setNewConsentOpen(false)
      setSelectedTrainer("")
      setSelectedScopes([])
      setSelectedDuration("30")
      setCustomDate(undefined)
      loadConsents()
    } catch {
      setConsentError("Error de conexion")
    }
  }

  const handleEditConsent = async () => {
    setConsentError("")
    if (selectedScopes.length === 0) {
      setConsentError("Selecciona al menos un permiso.")
      return
    }
    if (selectedDuration === "custom" && !customDate) {
      setConsentError("Selecciona una fecha de vencimiento.")
      return
    }
    const expiresAt = computeExpiresAt()
    try {
      const res = await fetch(`/api/consents/${editConsentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scopes: selectedScopes, expiresAt }),
      })
      if (!res.ok) {
        const data = await res.json()
        setConsentError(data.error || "Error al actualizar")
        return
      }
      setEditConsentOpen(false)
      loadConsents()
    } catch {
      setConsentError("Error de conexion")
    }
  }

  const handleRevokeConsent = async (consentId: string) => {
    try {
      await fetch(`/api/consents/${consentId}/revoke`, { method: "POST" })
      loadConsents()
    } catch {
      // ignore
    }
  }

  const handleRenewConsent = async (consentId: string) => {
    try {
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const res = await fetch(`/api/consents/${consentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expiresAt: newExpiry }),
      })
      if (res.ok) {
        loadConsents()
      }
    } catch {
      // ignore
    }
  }

  const handleHideConsent = async (consentId: string) => {
    try {
      await fetch(`/api/consents/${consentId}/hide`, { method: "POST" })
      loadConsents()
    } catch {
      // ignore
    }
  }

  const handleRestoreConsent = async (consentId: string) => {
    try {
      await fetch(`/api/consents/${consentId}/restore`, { method: "POST" })
      loadConsents()
    } catch {
      // ignore
    }
  }

  const openEditConsent = (consent: ConsentEntry) => {
    setEditConsentId(consent.id)
    setSelectedScopes([...consent.scopes])
    setSelectedDuration("30")
    setConsentError("")
    setEditConsentOpen(true)
  }

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const trainerHasActiveConsent = (trainerId: string) => {
    return consents.some(
      (c) => c.trainer?.id === trainerId && c.status === "ACTIVE"
    )
  }

  const availableTrainers = trainers.filter((t) => !trainerHasActiveConsent(t.id))

  // Derive active coach from the first ACTIVE consent
  const activeConsent = consents.find(
    (c) => c.status === "ACTIVE" && !c.hidden_by_client
  )
  const activeCoach =
    activeConsent?.trainer?.id
      ? (coachDirectory.find((c) => c.id === activeConsent.trainer!.id) ?? null)
      : consentLoading && user.planType === "COACHING"
        ? (coachDirectory.find((c) => c.id === "trainer-1") ?? null) // optimistic fallback while loading
        : null

  // Show block only when there's a resolved active coach
  const showCoachBlock =
    user.planType === "COACHING" &&
    user.coachStatus === "ACTIVE" &&
    !!activeCoach

  const handleOpenEdit = () => {
    setEditName(user.name)
    setEditEmail(user.email)
    setSaved(false)
    setEditOpen(true)
  }

  const handleSave = () => {
    if (!editName.trim() || !editEmail.trim()) return
    updateUser({ name: editName.trim(), email: editEmail.trim() })
    setSaved(true)
    setTimeout(() => {
      setEditOpen(false)
      setSaved(false)
    }, 1200)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* User card */}
      <Card className="border border-border">
        <CardContent className="py-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground text-xl font-bold">
              {user.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span>{user.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Miembro desde {formatDateLong(user.memberSince)}</span>
              </div>
            </div>
            {/* Edit button */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0 bg-transparent"
                  onClick={handleOpenEdit}
                  aria-label="Editar perfil"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Editar Perfil</DialogTitle>
                  <DialogDescription>
                    Actualiza tu nombre y correo electronico. Los cambios se guardaran
                    inmediatamente.
                  </DialogDescription>
                </DialogHeader>
                {saved ? (
                  <div className="flex flex-col items-center gap-3 py-8">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10">
                      <Check className="w-7 h-7 text-primary" />
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Perfil actualizado correctamente
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-4 py-2">
                      {/* Avatar preview */}
                      <div className="flex items-center justify-center">
                        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                          {editName
                            .trim()
                            .split(" ")
                            .map((w) => w[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2) || "??"}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-name" className="text-sm font-medium">
                          Nombre completo
                        </Label>
                        <Input
                          id="edit-name"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Tu nombre"
                          autoComplete="name"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="edit-email" className="text-sm font-medium">
                          Correo electronico
                        </Label>
                        <Input
                          id="edit-email"
                          type="email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                          placeholder="tu@email.com"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <DialogFooter className="flex-row gap-2 sm:justify-end">
                      <Button
                        variant="outline"
                        className="flex-1 sm:flex-none bg-transparent"
                        onClick={() => setEditOpen(false)}
                      >
                        <X className="w-4 h-4 mr-1.5" />
                        Cancelar
                      </Button>
                      <Button
                        className="flex-1 sm:flex-none"
                        onClick={handleSave}
                        disabled={!editName.trim() || !editEmail.trim()}
                      >
                        <Check className="w-4 h-4 mr-1.5" />
                        Guardar
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Mi entrenador — visible solo si hay un consent ACTIVE con un entrenador */}
      {showCoachBlock && activeCoach && (
        <Card className="border border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              Mi entrenador
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                {activeCoach.avatar}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{activeCoach.name}</p>
                <p className="text-xs text-muted-foreground">{activeCoach.specialty}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> {activeCoach.phone}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail className="w-3.5 h-3.5" /> {activeCoach.email}
            </div>
            <div className="mt-1">
              <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Disponibilidad
              </p>
              {activeCoach.availability.map((slot, i) => (
                <p key={i} className="text-xs text-muted-foreground ml-5">
                  {slot.day}: {slot.hours}
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{user.scanStreak}</p>
            <p className="text-xs text-muted-foreground">Racha</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(user.totalPoints)}</p>
            <p className="text-xs text-muted-foreground">Puntos</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{user.payment.plan}</p>
            <p className="text-xs text-muted-foreground">Plan</p>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            Preferencias
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {/* Weight unit */}
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                <Dumbbell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Unidad de peso</p>
                <p className="text-xs text-muted-foreground">Kilogramos o libras</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWeightUnit("kg")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  weightUnit === "kg"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                kg
              </button>
              <button
                type="button"
                onClick={() => setWeightUnit("lb")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  weightUnit === "lb"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                lb
              </button>
            </div>
          </div>

          {/* Rankings opt-in */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted shrink-0">
                <Shield className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Participar en rankings</p>
                <p className="text-xs text-muted-foreground">Puedes salir cuando quieras</p>
              </div>
            </div>
            <Switch checked={optedInRankings} onCheckedChange={toggleRankingsOptIn} />
          </div>
        </CardContent>
      </Card>

      {/* Privacy notice */}
      <Card className="border border-dashed border-primary/30 bg-primary/5 shadow-none">
        <CardContent className="flex items-start gap-3 py-3">
          <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Tu privacidad es importante.</span>{" "}
            Tus datos de entrenamiento son privados. Solo tu nombre aparece en rankings si decides
            participar. Tu sesion esta protegida con cookies seguras.
          </div>
        </CardContent>
      </Card>

      {/* Compartir con entrenador (USER only) */}
      {authUser?.role === "USER" && (
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                Compartir con entrenador
              </CardTitle>
              <Dialog open={newConsentOpen} onOpenChange={setNewConsentOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="gap-1 h-7 text-xs"
                    onClick={() => {
                      setSelectedTrainer("")
                      setSelectedScopes([])
                      setSelectedDuration("30")
                      setCustomDate(undefined)
                      setConsentError("")
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Compartir datos con entrenador</DialogTitle>
                    <DialogDescription>
                      Selecciona que datos deseas compartir y por cuanto tiempo.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4 py-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium">Entrenador</Label>
                      {availableTrainers.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2 px-3 bg-muted rounded-lg">
                          Todos los entrenadores ya tienen acceso activo
                        </p>
                      ) : (
                        <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar entrenador" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableTrainers.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium">Permisos</Label>
                      <div className="flex flex-col gap-2">
                        {ALL_SCOPES.map((scope) => (
                          <label key={scope.id} className="flex items-center gap-2 cursor-pointer">
                            <Checkbox
                              checked={selectedScopes.includes(scope.id)}
                              onCheckedChange={() => toggleScope(scope.id)}
                            />
                            <span className="text-sm text-foreground">{scope.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm font-medium">Duracion</Label>
                      <Select value={selectedDuration} onValueChange={(v) => { setSelectedDuration(v); if (v !== "custom") setCustomDate(undefined) }}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedDuration === "custom" && (
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-sm font-medium">Fecha de vencimiento</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {customDate ? customDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "Seleccionar fecha"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={customDate}
                              onSelect={(date: Date | undefined) => setCustomDate(date)}
                              disabled={(date: Date) => date <= new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    )}
                    {consentError && (
                      <p className="text-xs text-destructive">{consentError}</p>
                    )}
                  </div>
                  <DialogFooter className="flex-row gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      className="flex-1 sm:flex-none bg-transparent"
                      onClick={() => setNewConsentOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button className="flex-1 sm:flex-none" onClick={handleCreateConsent} disabled={availableTrainers.length === 0}>
                      <Check className="w-4 h-4 mr-1.5" />
                      Compartir
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {consentLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
            ) : consents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No has compartido datos con ningun entrenador.
              </p>
            ) : (
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="active">
                    Activos ({consents.filter(c => c.status === "ACTIVE" && !c.hidden_by_client).length})
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    Historial ({consents.filter(c => c.status !== "ACTIVE" || c.hidden_by_client).length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="flex flex-col gap-2 mt-4">
                  {consents.filter(c => c.status === "ACTIVE" && !c.hidden_by_client).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No tienes consentimientos activos.
                    </p>
                  ) : (
                    consents.filter(c => c.status === "ACTIVE" && !c.hidden_by_client).map((consent) => {
                const statusColor =
                  consent.status === "ACTIVE"
                    ? "bg-primary/10 text-primary"
                    : consent.status === "REVOKED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                const statusLabel =
                  consent.status === "ACTIVE"
                    ? "Activo"
                    : consent.status === "REVOKED"
                      ? "Revocado"
                      : "Expirado"

                // Calculate days until expiry
                let daysUntilExpiry: number | null = null
                let showExpiryWarning = false
                let isExpired = false
                if (consent.expires_at) {
                  const now = new Date()
                  const expiry = new Date(consent.expires_at)
                  daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  showExpiryWarning = consent.status === "ACTIVE" && daysUntilExpiry <= 3 && daysUntilExpiry > 0
                  isExpired = daysUntilExpiry <= 0
                }

                return (
                  <div key={consent.id} className="border border-border rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {consent.trainer?.avatar || "??"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {consent.trainer?.name || "Entrenador"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Desde {formatDateLong(consent.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`border-0 text-[10px] ${statusColor}`}>
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {consent.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-[10px]">
                          {ALL_SCOPES.find((s) => s.id === scope)?.label ?? scope}
                        </Badge>
                      ))}
                    </div>
                    {consent.expires_at && (
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Expira: {formatDateLong(consent.expires_at)}
                      </p>
                    )}

                    {/* Expiry warning banner */}
                    {showExpiryWarning && (
                      <Alert className="mb-2 py-2 bg-accent/10 border-accent/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                        <AlertDescription className="text-xs text-accent ml-2">
                          Expira en {daysUntilExpiry} {daysUntilExpiry === 1 ? "día" : "días"}
                        </AlertDescription>
                      </Alert>
                    )}
                    {isExpired && consent.status === "ACTIVE" && (
                      <Alert className="mb-2 py-2 bg-destructive/10 border-destructive/30">
                        <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                        <AlertDescription className="text-xs text-destructive ml-2">
                          Este consentimiento ha expirado
                        </AlertDescription>
                      </Alert>
                    )}
                    {consent.status === "ACTIVE" && (
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 bg-transparent"
                          onClick={() => openEditConsent(consent)}
                        >
                          <PencilLine className="w-3 h-3" />
                          Editar
                        </Button>
                        {consent.expires_at && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 bg-transparent text-primary border-primary/30 hover:bg-primary/10"
                            onClick={() => handleRenewConsent(consent.id)}
                          >
                            <RefreshCw className="w-3 h-3" />
                            Renovar 30d
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 bg-transparent text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => handleRevokeConsent(consent.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Revocar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })
                  )}
                </TabsContent>

                <TabsContent value="history" className="flex flex-col gap-2 mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground">
                      {showHidden ? "Mostrando todos los consentimientos" : "Consentimientos ocultos no se muestran"}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      onClick={() => setShowHidden(!showHidden)}
                    >
                      {showHidden ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                      {showHidden ? "Ocultar" : "Mostrar"} ocultos
                    </Button>
                  </div>

                  {consents.filter(c => {
                    const isHistory = c.status !== "ACTIVE" || c.hidden_by_client
                    if (!isHistory) return false
                    if (!showHidden && c.hidden_by_client) return false
                    return true
                  }).length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      {showHidden ? "No hay consentimientos en el historial." : "No hay consentimientos visibles en el historial."}
                    </p>
                  ) : (
                    consents.filter(c => {
                      const isHistory = c.status !== "ACTIVE" || c.hidden_by_client
                      if (!isHistory) return false
                      if (!showHidden && c.hidden_by_client) return false
                      return true
                    }).map((consent) => {
                const statusColor =
                  consent.status === "ACTIVE"
                    ? "bg-primary/10 text-primary"
                    : consent.status === "REVOKED"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-muted text-muted-foreground"
                const statusLabel =
                  consent.status === "ACTIVE"
                    ? "Activo"
                    : consent.status === "REVOKED"
                      ? "Revocado"
                      : "Expirado"

                return (
                  <div key={consent.id} className="border border-border rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {consent.trainer?.avatar || "??"}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {consent.trainer?.name || "Entrenador"}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            Desde {formatDateLong(consent.created_at)}
                          </p>
                        </div>
                      </div>
                      <Badge className={`border-0 text-[10px] ${statusColor}`}>
                        {statusLabel}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {consent.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary" className="text-[10px]">
                          {ALL_SCOPES.find((s) => s.id === scope)?.label ?? scope}
                        </Badge>
                      ))}
                    </div>
                    {consent.status === "REVOKED" && consent.revoked_at ? (
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Revocado el: {formatDateLong(consent.revoked_at)}
                      </p>
                    ) : consent.expires_at ? (
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Expira: {formatDateLong(consent.expires_at)}
                      </p>
                    ) : null}

                    {/* Action buttons for history */}
                    <div className="flex gap-2 mt-2">
                      {consent.hidden_by_client ? (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                          onClick={() => handleRestoreConsent(consent.id)}
                        >
                          <Eye className="w-3 h-3" />
                          Restaurar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 bg-transparent text-muted-foreground"
                          onClick={() => handleHideConsent(consent.id)}
                        >
                          <EyeOff className="w-3 h-3" />
                          Ocultar
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit consent dialog */}
      <Dialog open={editConsentOpen} onOpenChange={setEditConsentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar permisos</DialogTitle>
            <DialogDescription>
              Modifica los permisos compartidos con tu entrenador.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Permisos</Label>
              <div className="flex flex-col gap-2">
                {ALL_SCOPES.map((scope) => (
                  <label key={scope.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={selectedScopes.includes(scope.id)}
                      onCheckedChange={() => toggleScope(scope.id)}
                    />
                    <span className="text-sm text-foreground">{scope.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-medium">Nueva duracion</Label>
              <Select value={selectedDuration} onValueChange={(v) => { setSelectedDuration(v); if (v !== "custom") setCustomDate(undefined) }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDuration === "custom" && (
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm font-medium">Fecha de vencimiento</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDate ? customDate.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(date: Date | undefined) => setCustomDate(date)}
                      disabled={(date: Date) => date <= new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
            {consentError && (
              <p className="text-xs text-destructive">{consentError}</p>
            )}
          </div>
          <DialogFooter className="flex-row gap-2 sm:justify-end">
            <Button
              variant="outline"
              className="flex-1 sm:flex-none bg-transparent"
              onClick={() => setEditConsentOpen(false)}
            >
              Cancelar
            </Button>
            <Button className="flex-1 sm:flex-none" onClick={handleEditConsent}>
              <Check className="w-4 h-4 mr-1.5" />
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account info */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Datos de cuenta
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Nombre</span>
            <span className="text-sm font-medium text-foreground">{user.name}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{user.email}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">ID</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {user.id}
            </Badge>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Plan actual</span>
            <span className="text-sm font-medium text-foreground">{user.payment.plan}</span>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Estado pago</span>
            <Badge
              className={`border-0 text-xs ${
                user.payment.status === "al_dia"
                  ? "bg-primary/10 text-primary"
                  : user.payment.status === "por_vencer"
                    ? "bg-accent/15 text-accent"
                    : "bg-destructive/10 text-destructive"
              }`}
            >
              {user.payment.status === "al_dia"
                ? "Al dia"
                : user.payment.status === "por_vencer"
                  ? "Por vencer"
                  : "Vencido"}
            </Badge>
          </div>
          <div className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
            <span className="text-sm text-muted-foreground">Rol</span>
            <Badge className="bg-primary/10 text-primary border-0 text-xs">
              {authUser?.role || "USER"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full bg-transparent text-destructive border-destructive/30 hover:bg-destructive/10"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Cerrar sesion
      </Button>
    </div>
  )
}
