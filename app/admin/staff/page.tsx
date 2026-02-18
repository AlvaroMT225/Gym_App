"use client"

import { useState } from "react"
import {
  ShieldCheck,
  Plus,
  UserPlus,
  UserMinus,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Mail,
  Calendar,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
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
import { adminStaff, type StaffMember } from "@/lib/admin-data"
import { ROLE_PERMISSIONS, type Permission } from "@/lib/rbac"

const allPermissions: { key: Permission; label: string }[] = [
  { key: "workouts:read", label: "Ver entrenamientos" },
  { key: "workouts:write", label: "Editar entrenamientos" },
  { key: "clients:read", label: "Ver clientes" },
  { key: "clients:assign", label: "Asignar clientes" },
  { key: "machines:manage", label: "Gestionar maquinas" },
  { key: "rankings:manage", label: "Gestionar rankings" },
  { key: "billing:manage", label: "Gestionar pagos" },
  { key: "staff:manage", label: "Gestionar staff" },
  { key: "gym:settings", label: "Ajustes del gym" },
]

export default function StaffPage() {
  const [createOpen, setCreateOpen] = useState(false)
  const [editStaff, setEditStaff] = useState<StaffMember | null>(null)

  const admins = adminStaff.filter((s) => s.role === "ADMIN")
  const trainers = adminStaff.filter((s) => s.role === "TRAINER")

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Staff & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">{adminStaff.length} miembros de staff</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <UserPlus className="w-4 h-4" />
          Alta de staff
        </Button>
      </div>

      {/* Roles Overview */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="border border-border">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{admins.length}</p>
              <p className="text-xs text-muted-foreground">Administradores</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15">
              <Shield className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">{trainers.length}</p>
              <p className="text-xs text-muted-foreground">Entrenadores</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff List */}
      <Card className="border border-border">
        <CardContent className="p-0">
          {adminStaff.map((staff) => (
            <div
              key={staff.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                {staff.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{staff.name}</p>
                  <Badge
                    className={
                      staff.status === "activo"
                        ? "bg-success/10 text-success border-0 text-xs"
                        : "bg-muted text-muted-foreground border-0 text-xs"
                    }
                  >
                    {staff.status === "activo" ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{staff.email}</p>
              </div>
              <Badge
                variant="outline"
                className="shrink-0 hidden sm:flex"
              >
                {staff.role === "ADMIN" ? "Admin" : "Entrenador"}
              </Badge>
              <Button variant="ghost" size="sm" onClick={() => setEditStaff(staff)}>
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* RBAC Reference */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Permisos por rol
        </h2>
        <Card className="border border-border overflow-x-auto">
          <CardContent className="p-0">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Permiso</th>
                  <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Admin</th>
                  <th className="text-center px-4 py-2 font-semibold text-muted-foreground">Entrenador</th>
                </tr>
              </thead>
              <tbody>
                {allPermissions.map((perm) => (
                  <tr key={perm.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 text-foreground">{perm.label}</td>
                    <td className="px-4 py-2 text-center">
                      {ROLE_PERMISSIONS.ADMIN.includes(perm.key) ? (
                        <CheckCircle className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {ROLE_PERMISSIONS.TRAINER.includes(perm.key) ? (
                        <CheckCircle className="w-4 h-4 text-success mx-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Create Staff Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Alta de Staff</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input placeholder="Nombre completo" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input type="email" placeholder="email@gym.com" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Rol</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="TRAINER">Entrenador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Permisos</Label>
              <div className="flex flex-col gap-2 p-3 border border-border rounded-lg">
                {allPermissions.map((perm) => (
                  <div key={perm.key} className="flex items-center gap-2">
                    <Checkbox id={perm.key} />
                    <label htmlFor={perm.key} className="text-xs text-foreground cursor-pointer">
                      {perm.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
            <Button className="w-full gap-2">
              <UserPlus className="w-4 h-4" />
              Registrar staff
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Staff Sheet */}
      <Sheet open={!!editStaff} onOpenChange={() => setEditStaff(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Staff</SheetTitle>
          </SheetHeader>
          {editStaff && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex items-center gap-3 py-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary font-bold">
                  {editStaff.avatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{editStaff.name}</p>
                  <p className="text-xs text-muted-foreground">{editStaff.email}</p>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Label>Rol</Label>
                <Select defaultValue={editStaff.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="TRAINER">Entrenador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select defaultValue={editStaff.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Permisos</Label>
                <div className="flex flex-col gap-2 p-3 border border-border rounded-lg">
                  {allPermissions.map((perm) => (
                    <div key={perm.key} className="flex items-center gap-2">
                      <Checkbox
                        id={`edit-${perm.key}`}
                        defaultChecked={editStaff.permissions.includes("all") || editStaff.permissions.includes(perm.key)}
                      />
                      <label htmlFor={`edit-${perm.key}`} className="text-xs text-foreground cursor-pointer">
                        {perm.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <Separator />
              <div className="flex flex-col gap-2">
                <Button className="w-full gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Guardar cambios
                </Button>
                {editStaff.status === "activo" && (
                  <Button variant="destructive" className="w-full gap-2">
                    <UserMinus className="w-4 h-4" />
                    Dar de baja
                  </Button>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
