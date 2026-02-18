"use client"

import { useState, useEffect } from "react"
import {
  QrCode,
  Plus,
  Search,
  Settings,
  CheckCircle,
  Wrench,
  XCircle,
  MapPin,
  ShieldAlert,
  BookOpen,
  Eye,
  Save,
  Pencil,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { adminMachines as initialMachines, type AdminMachine } from "@/lib/admin-data"

const statusConfig = {
  activa: { label: "Activa", icon: CheckCircle, color: "text-success", badgeClass: "bg-success/10 text-success border-0" },
  mantenimiento: { label: "Mantenimiento", icon: Wrench, color: "text-accent", badgeClass: "bg-accent/15 text-accent border-0" },
  inactiva: { label: "Inactiva", icon: XCircle, color: "text-destructive", badgeClass: "bg-destructive/10 text-destructive border-0" },
}

export default function MachinesPage() {
  const [machines, setMachines] = useState<AdminMachine[]>(initialMachines)
  const [search, setSearch] = useState("")
  const [createOpen, setCreateOpen] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<AdminMachine | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editData, setEditData] = useState<AdminMachine | null>(null)
  const [editSaved, setEditSaved] = useState(false)

  const filtered = machines.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.group.toLowerCase().includes(search.toLowerCase())
  )

  const counts = {
    activa: machines.filter((m) => m.status === "activa").length,
    mantenimiento: machines.filter((m) => m.status === "mantenimiento").length,
    inactiva: machines.filter((m) => m.status === "inactiva").length,
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Maquinas & QR</h1>
          <p className="text-sm text-muted-foreground mt-1">{machines.length} maquinas registradas</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nueva maquina
        </Button>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {(["activa", "mantenimiento", "inactiva"] as const).map((status) => {
          const cfg = statusConfig[status]
          return (
            <Card key={status} className="border border-border">
              <CardContent className="flex items-center gap-3 py-4">
                <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                <div>
                  <p className="text-xl font-bold text-foreground">{counts[status]}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar maquina, ID o grupo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Machines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((machine) => {
          const cfg = statusConfig[machine.status]
          return (
            <Card key={machine.id} className="border border-border hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-semibold text-foreground">{machine.name}</CardTitle>
                  <Badge className={cfg.badgeClass}>{cfg.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{machine.id}</p>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Settings className="w-3.5 h-3.5" />
                    Grupo: {machine.group}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    {machine.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="w-3.5 h-3.5" />
                    Tutorial: {machine.tutorialId}
                  </div>
                  {machine.safetyRequired && (
                    <div className="flex items-center gap-2 text-xs text-accent">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      Seguridad obligatoria
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => { setSelectedMachine(machine); setQrDialogOpen(true) }}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    Ver QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => {
                      setEditData({ ...machine })
                      setEditSaved(false)
                      setEditOpen(true)
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <QrCode className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No se encontraron maquinas</p>
        </div>
      )}

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Codigo QR</DialogTitle>
          </DialogHeader>
          {selectedMachine && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-48 h-48 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/30">
                <div className="text-center">
                  <QrCode className="w-16 h-16 text-foreground mx-auto mb-2" />
                  <p className="text-xs font-mono text-muted-foreground">{selectedMachine.qrCode}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-foreground">{selectedMachine.name}</p>
                <p className="text-xs text-muted-foreground">{selectedMachine.id} | {selectedMachine.location}</p>
              </div>
              <Button variant="outline" className="w-full">
                Descargar QR
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Machine Sheet */}
      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nueva Maquina</SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-5">
            <div className="flex flex-col gap-2">
              <Label>ID de maquina</Label>
              <Input placeholder="ej. PRESS-01" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Nombre</Label>
              <Input placeholder="ej. Press de Banca" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Grupo muscular</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar grupo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pecho">Pecho</SelectItem>
                  <SelectItem value="Espalda">Espalda</SelectItem>
                  <SelectItem value="Piernas">Piernas</SelectItem>
                  <SelectItem value="Hombros">Hombros</SelectItem>
                  <SelectItem value="Brazos">Brazos</SelectItem>
                  <SelectItem value="Multifuncional">Multifuncional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Ubicacion</Label>
              <Input placeholder="ej. Zona A" />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Estado</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                  <SelectItem value="inactiva">Inactiva</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Crear maquina
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Machine Sheet */}
      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Maquina</SheetTitle>
          </SheetHeader>
          {editData && !editSaved && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Nombre</Label>
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData((prev) => prev ? { ...prev, name: e.target.value } : prev)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Grupo muscular</Label>
                <Select
                  value={editData.group}
                  onValueChange={(val) => setEditData((prev) => prev ? { ...prev, group: val } : prev)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pecho">Pecho</SelectItem>
                    <SelectItem value="Espalda">Espalda</SelectItem>
                    <SelectItem value="Piernas">Piernas</SelectItem>
                    <SelectItem value="Hombros">Hombros</SelectItem>
                    <SelectItem value="Brazos">Brazos</SelectItem>
                    <SelectItem value="Multifuncional">Multifuncional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select
                  value={editData.status}
                  onValueChange={(val) => setEditData((prev) => prev ? { ...prev, status: val as AdminMachine["status"] } : prev)}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                    <SelectItem value="inactiva">Inactiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Ubicacion</Label>
                <Input
                  value={editData.location}
                  onChange={(e) => setEditData((prev) => prev ? { ...prev, location: e.target.value } : prev)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tutorial ID</Label>
                <Input
                  value={editData.tutorialId}
                  onChange={(e) => setEditData((prev) => prev ? { ...prev, tutorialId: e.target.value } : prev)}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Seguridad obligatoria</Label>
                <Switch
                  checked={editData.safetyRequired}
                  onCheckedChange={(val) => setEditData((prev) => prev ? { ...prev, safetyRequired: val } : prev)}
                />
              </div>
              <Separator />
              <Button
                className="w-full gap-2"
                onClick={() => {
                  setMachines((prev) => prev.map((m) => m.id === editData!.id ? editData! : m))
                  setEditSaved(true)
                }}
              >
                <Save className="w-4 h-4" />
                Guardar cambios
              </Button>
            </div>
          )}
          {editSaved && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">Cambios guardados</p>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cerrar</Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
