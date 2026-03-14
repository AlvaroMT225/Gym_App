"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  ShieldCheck,
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Edit,
  UserMinus,
  UserCheck,
  Phone,
  Mail,
  Calendar,
  Search,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
export const dynamic = 'force-dynamic'


interface StaffMember {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  role: string
  roleLabel: string
  isActive: boolean
  permissions: string[]
  assignedAt: string | null
  createdAt: string | null
}

interface Kpis {
  total: number
  admins: number
  coaches: number
  activos: number
}

interface EditForm {
  role: "admin" | "coach" | "super_admin"
  isActive: boolean
  permissions: string[]
}

const AVAILABLE_PERMISSIONS: { key: string; label: string }[] = [
  { key: "manage_members", label: "Gestionar miembros" },
  { key: "manage_payments", label: "Gestionar pagos" },
  { key: "manage_machines", label: "Gestionar máquinas" },
  { key: "manage_staff", label: "Gestionar staff" },
  { key: "manage_content", label: "Gestionar contenido" },
  { key: "manage_promos", label: "Gestionar promociones" },
  { key: "manage_settings", label: "Ajustes del gym" },
  { key: "view_clients", label: "Ver clientes" },
  { key: "manage_routines", label: "Gestionar rutinas" },
  { key: "manage_proposals", label: "Gestionar propuestas" },
]

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [kpis, setKpis] = useState<Kpis>({ total: 0, admins: 0, coaches: 0, activos: 0 })
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("todos")

  const [editOpen, setEditOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<StaffMember | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ role: "coach", isActive: true, permissions: [] })
  const [editSaving, setEditSaving] = useState(false)

  const loadStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/staff")
      if (!res.ok) return
      const data = (await res.json()) as { kpis: Kpis; staff: StaffMember[] }
      setKpis(data.kpis ?? { total: 0, admins: 0, coaches: 0, activos: 0 })
      setStaff(data.staff ?? [])
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStaff()
  }, [loadStaff])

  const filtered = useMemo(() => {
    return staff.filter((s) => {
      const matchesSearch =
        !search.trim() ||
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      const matchesRole =
        roleFilter === "todos" ||
        (roleFilter === "admin" && (s.role === "admin" || s.role === "super_admin")) ||
        (roleFilter === "coach" && s.role === "coach")
      return matchesSearch && matchesRole
    })
  }, [staff, search, roleFilter])

  function openEdit(member: StaffMember) {
    setEditTarget(member)
    setEditForm({
      role: member.role as "admin" | "coach" | "super_admin",
      isActive: member.isActive,
      permissions: [...member.permissions],
    })
    setEditOpen(true)
  }

  function togglePermission(key: string) {
    setEditForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key)
        ? prev.permissions.filter((p) => p !== key)
        : [...prev.permissions, key],
    }))
  }

  async function handleEdit() {
    if (!editTarget) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/admin/staff/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editForm.role,
          isActive: editForm.isActive,
          permissions: editForm.permissions,
        }),
      })
      if (!res.ok) return
      setEditOpen(false)
      await loadStaff()
    } catch {
      // silently fail
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Staff & Roles</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestión de administradores y entrenadores</p>
      </div>

      {/* KPIs */}
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
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/30 shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis.total}</p>
                  <p className="text-xs text-muted-foreground">Total staff</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 shrink-0">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis.admins}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-accent/15 shrink-0">
                  <Shield className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis.coaches}</p>
                  <p className="text-xs text-muted-foreground">Entrenadores</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border border-border">
              <CardContent className="py-4 flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis.activos}</p>
                  <p className="text-xs text-muted-foreground">Activos</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los roles</SelectItem>
            <SelectItem value="admin">Administradores</SelectItem>
            <SelectItem value="coach">Entrenadores</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Staff List */}
      {loading ? (
        <Card className="border border-border">
          <CardContent className="p-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0"
              >
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-24 hidden sm:block" />
                <Skeleton className="h-8 w-8" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No hay staff para los filtros seleccionados</p>
        </div>
      ) : (
        <Card className="border border-border">
          <CardContent className="p-0">
            {filtered.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {getInitials(member.firstName, member.lastName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">
                      {member.firstName} {member.lastName}
                    </p>
                    <Badge
                      className={
                        member.isActive
                          ? "bg-success/10 text-success border-0 text-xs"
                          : "bg-muted text-muted-foreground border-0 text-xs"
                      }
                    >
                      {member.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  {member.permissions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.permissions.slice(0, 3).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-[10px] px-1.5 py-0">
                          {perm.replace(/_/g, " ")}
                        </Badge>
                      ))}
                      {member.permissions.length > 3 && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          +{member.permissions.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 hidden sm:flex">
                  {member.roleLabel}
                </Badge>
                <Button variant="ghost" size="sm" onClick={() => openEdit(member)}>
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Edit Staff Sheet */}
      <Sheet
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false)
        }}
      >
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Staff</SheetTitle>
          </SheetHeader>
          {editTarget && (
            <div className="mt-6 flex flex-col gap-5">
              {/* Member info header */}
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold shrink-0">
                  {getInitials(editTarget.firstName, editTarget.lastName)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {editTarget.firstName} {editTarget.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 shrink-0" />
                    {editTarget.email}
                  </p>
                  {editTarget.phone && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 shrink-0" />
                      {editTarget.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Meta dates */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                {editTarget.assignedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Asignado: {formatDate(editTarget.assignedAt)}
                  </span>
                )}
                {editTarget.createdAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Desde: {formatDate(editTarget.createdAt)}
                  </span>
                )}
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Label>Rol</Label>
                <Select
                  value={editForm.role}
                  onValueChange={(value: "admin" | "coach" | "super_admin") =>
                    setEditForm((prev) => ({ ...prev, role: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="coach">Entrenador</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select
                  value={editForm.isActive ? "active" : "inactive"}
                  onValueChange={(value) =>
                    setEditForm((prev) => ({ ...prev, isActive: value === "active" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">
                      <span className="flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-success" />
                        Activo
                      </span>
                    </SelectItem>
                    <SelectItem value="inactive">
                      <span className="flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                        Inactivo
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-2">
                <Label>Permisos</Label>
                <div className="flex flex-col gap-2 p-3 border border-border rounded-lg">
                  {AVAILABLE_PERMISSIONS.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${perm.key}`}
                        checked={editForm.permissions.includes(perm.key)}
                        onCheckedChange={() => togglePermission(perm.key)}
                      />
                      <label
                        htmlFor={`edit-${perm.key}`}
                        className="text-xs text-foreground cursor-pointer"
                      >
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-2">
                <Button className="w-full gap-2" onClick={handleEdit} disabled={editSaving}>
                  <CheckCircle className="w-4 h-4" />
                  {editSaving ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button
                  variant="outline"
                  className={`w-full gap-2 ${
                    editForm.isActive
                      ? "border-destructive/50 text-destructive hover:text-destructive"
                      : "border-success/50 text-success hover:text-success"
                  }`}
                  onClick={() =>
                    setEditForm((prev) => ({ ...prev, isActive: !prev.isActive }))
                  }
                >
                  {editForm.isActive ? (
                    <>
                      <UserMinus className="w-4 h-4" />
                      Marcar como inactivo
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Marcar como activo
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
