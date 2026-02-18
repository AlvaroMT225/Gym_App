"use client"

import { useState } from "react"
import {
  Gift,
  Plus,
  Eye,
  Tag,
  Calendar,
  Users,
  BarChart3,
  CheckCircle,
  Clock,
  FileText,
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
import { adminPromos } from "@/lib/admin-data"

const statusConfig = {
  activa: { label: "Activa", badgeClass: "bg-success/10 text-success border-0" },
  expirada: { label: "Expirada", badgeClass: "bg-muted text-muted-foreground border-0" },
  borrador: { label: "Borrador", badgeClass: "bg-accent/15 text-accent border-0" },
}

export default function PromosPage() {
  const [createOpen, setCreateOpen] = useState(false)

  const activas = adminPromos.filter((p) => p.status === "activa")
  const expiradas = adminPromos.filter((p) => p.status === "expirada")

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Promos</h1>
          <p className="text-sm text-muted-foreground mt-1">{adminPromos.length} promociones</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Crear promo
        </Button>
      </div>

      {/* Active Promos */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Activas ({activas.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activas.map((promo) => (
            <Card key={promo.id} className="border border-border hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">{promo.title}</CardTitle>
                  <Badge className={statusConfig[promo.status].badgeClass}>
                    {statusConfig[promo.status].label}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{promo.description}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Tag className="w-3.5 h-3.5" />
                    Codigo: <span className="font-mono font-medium text-foreground">{promo.code}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    {promo.validFrom} - {promo.validUntil}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    Segmento: {promo.segment}
                  </div>
                </div>
                <div className="flex items-center gap-4 py-2 px-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-success" />
                    <span className="text-xs font-medium text-foreground">{promo.redemptions} canjes</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-foreground">{promo.views} vistas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Expired Promos */}
      {expiradas.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Expiradas ({expiradas.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {expiradas.map((promo) => (
              <Card key={promo.id} className="border border-border opacity-60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">{promo.title}</CardTitle>
                    <Badge className={statusConfig[promo.status].badgeClass}>
                      {statusConfig[promo.status].label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{promo.description}</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                    <Tag className="w-3.5 h-3.5" />
                    Codigo: <span className="font-mono">{promo.code}</span>
                  </div>
                  <div className="flex items-center gap-4 py-2 px-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">{promo.redemptions} canjes | {promo.views} vistas</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Metrics Placeholder */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Metricas
        </h2>
        <Card className="border border-dashed border-border">
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Proximamente</p>
            <p className="text-xs mt-1">Graficas de redenciones, vistas y conversion por promo</p>
          </CardContent>
        </Card>
      </div>

      {/* Create Promo Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Crear Promo</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>Titulo</Label>
              <Input placeholder="ej. 20% en Suplementos" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Descripcion</Label>
              <Textarea placeholder="Descripcion de la promo..." />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Codigo</Label>
              <Input placeholder="ej. MINTHY20" className="font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-2">
                <Label>Fecha inicio</Label>
                <Input type="date" />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Fecha fin</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Segmento</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="nuevos">Nuevos</SelectItem>
                  <SelectItem value="activos">Activos</SelectItem>
                  <SelectItem value="vencidos">Vencidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Crear promo
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
