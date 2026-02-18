"use client"

import {
  User,
  Mail,
  Shield,
  Calendar,
  Save,
  Key,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { DEMO_USERS } from "@/lib/rbac"

export default function AccountPage() {
  const admin = DEMO_USERS.find((u) => u.role === "ADMIN")!

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Mi Cuenta</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Informacion de tu perfil de administrador
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-lg">
        {/* Profile Info */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary text-xl font-bold">
                {admin.avatar}
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">{admin.name}</p>
                <Badge className="bg-primary/10 text-primary border-0">{admin.role}</Badge>
              </div>
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input defaultValue={admin.name} />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Email</Label>
              <Input defaultValue={admin.email} type="email" />
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Key className="w-4 h-4 text-accent" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Password actual</Label>
              <Input type="password" placeholder="********" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Nuevo password</Label>
              <Input type="password" placeholder="Nuevo password" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Confirmar password</Label>
              <Input type="password" placeholder="Confirmar" />
            </div>
          </CardContent>
        </Card>

        {/* Role Info */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              Rol y permisos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Rol</span>
                <Badge variant="outline">Administrador</Badge>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Permisos</span>
                <span className="text-sm text-foreground">Acceso completo</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button className="gap-2 self-end">
          <Save className="w-4 h-4" />
          Guardar cambios
        </Button>
      </div>
    </div>
  )
}
