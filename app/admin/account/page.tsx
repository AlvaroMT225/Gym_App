"use client"

import { useState, useEffect, useCallback } from "react"
import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  Phone,
  FileText,
  CheckCircle,
  Lock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

interface AdminProfile {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  avatarUrl: string | null
  bio: string
  role: string
  roleLabel: string
  createdAt: string | null
}

interface EditForm {
  firstName: string
  lastName: string
  phone: string
  bio: string
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-EC", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export default function AccountPage() {
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState<EditForm>({
    firstName: "",
    lastName: "",
    phone: "",
    bio: "",
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const loadProfile = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/account")
      if (!res.ok) return
      const data = (await res.json()) as { profile: AdminProfile }
      setProfile(data.profile)
      setForm({
        firstName: data.profile.firstName,
        lastName: data.profile.lastName,
        phone: data.profile.phone,
        bio: data.profile.bio,
      })
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  async function handleSave() {
    if (!form.firstName.trim()) return
    setSaving(true)
    try {
      const res = await fetch("/api/admin/account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) return
      const data = (await res.json()) as { profile: AdminProfile }
      setProfile(data.profile)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  const displayName = profile
    ? `${profile.firstName} ${profile.lastName}`.trim() || profile.email
    : ""

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Mi Cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Información de tu perfil de administrador
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-3xl">
        {/* ── Perfil ── */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {/* Avatar + name header */}
            {loading ? (
              <div className="flex items-center gap-4 mb-2">
                <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                <div className="flex flex-col gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-bold shrink-0">
                  {profile
                    ? getInitials(profile.firstName || profile.email.charAt(0), profile.lastName || "")
                    : "?"}
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">{displayName}</p>
                  <Badge className="bg-primary/10 text-primary border-0 mt-1">
                    {profile?.roleLabel ?? "Administrador"}
                  </Badge>
                </div>
              </div>
            )}

            <Separator />

            {/* Nombre y Apellido */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label>Nombre *</Label>
                {loading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    placeholder="Nombre"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label>Apellido</Label>
                {loading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    placeholder="Apellido"
                  />
                )}
              </div>
            </div>

            {/* Email + Teléfono */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  Email
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-1">
                    No editable
                  </Badge>
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input
                    value={profile?.email ?? ""}
                    readOnly
                    disabled
                    className="bg-muted/30 text-muted-foreground"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Label className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  Teléfono
                </Label>
                {loading ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    placeholder="+593 7 123 4567"
                  />
                )}
              </div>
            </div>

            {/* Bio */}
            <div className="flex flex-col gap-2">
              <Label className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                Bio
              </Label>
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <Textarea
                  value={form.bio}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  placeholder="Cuéntanos sobre ti..."
                  rows={3}
                />
              )}
            </div>

            {/* Miembro desde */}
            {!loading && profile?.createdAt && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                Miembro desde {formatDate(profile.createdAt)}
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-end gap-3">
              {saved && (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Guardado
                </span>
              )}
              <Button
                className="gap-2"
                onClick={handleSave}
                disabled={loading || !form.firstName.trim() || saving}
              >
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── Rol y permisos + Seguridad ── */}
        <div className="grid grid-cols-2 gap-6">
          <Card className="border border-border">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4 text-primary" />
                Rol y permisos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">Rol</span>
                    <Badge variant="outline">{profile?.roleLabel ?? "Administrador"}</Badge>
                  </div>
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-muted-foreground">Permisos</span>
                    <span className="text-sm text-foreground">Acceso completo</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border border-border opacity-60">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                Seguridad
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">
                  Próximamente
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                El cambio de email y contraseña se gestionará a través del flujo de autenticación de Supabase.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
