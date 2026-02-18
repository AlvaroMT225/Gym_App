"use client"

import { useState } from "react"
import {
  Settings,
  DollarSign,
  Clock,
  AlertTriangle,
  Palette,
  Save,
  Plus,
  Trash2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { gymSettings } from "@/lib/admin-data"

export default function SettingsPage() {
  const [settings] = useState(gymSettings)

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Ajustes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configuracion general del gimnasio
        </p>
      </div>

      <div className="flex flex-col gap-6 max-w-2xl">
        {/* General */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Nombre del gimnasio</Label>
              <Input defaultValue={settings.gymName} />
            </div>
          </CardContent>
        </Card>

        {/* Plans & Prices */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              Planes y Precios
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {settings.plans.map((plan) => (
              <div key={plan.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                <div className="flex-1 min-w-0">
                  <Input defaultValue={plan.name} className="mb-1" />
                </div>
                <div className="w-24">
                  <Input type="number" defaultValue={plan.price} className="text-right" />
                </div>
                <div className="w-24 text-xs text-muted-foreground shrink-0">{plan.duration}</div>
                <Button variant="ghost" size="sm" className="shrink-0">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" className="gap-2 self-start mt-2">
              <Plus className="w-4 h-4" />
              Agregar plan
            </Button>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Horarios
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {settings.schedule.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm text-foreground w-40 shrink-0">{s.day}</span>
                <Input type="time" defaultValue={s.open} className="w-28" />
                <span className="text-xs text-muted-foreground">a</span>
                <Input type="time" defaultValue={s.close} className="w-28" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Expiration Rules */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent" />
              Reglas de Vencimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea defaultValue={settings.expirationRules} rows={4} />
          </CardContent>
        </Card>

        {/* Branding */}
        <Card className="border border-border">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="w-4 h-4 text-primary" />
              Branding
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label>Color principal</Label>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg border border-border"
                  style={{ backgroundColor: settings.branding.primaryColor }}
                />
                <Input defaultValue={settings.branding.primaryColor} className="w-40 font-mono" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                <div className="w-16 h-16 rounded-lg border border-dashed border-border flex items-center justify-center bg-muted/30">
                  <Palette className="w-6 h-6 text-muted-foreground/40" />
                </div>
                <Button variant="outline" size="sm">Subir logo</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <Button className="gap-2 self-end">
          <Save className="w-4 h-4" />
          Guardar ajustes
        </Button>
      </div>
    </div>
  )
}
