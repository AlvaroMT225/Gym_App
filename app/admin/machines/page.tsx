"use client"

import { useState, useMemo, useEffect, useCallback } from "react"
import {
  QrCode,
  Plus,
  Search,
  CheckCircle,
  Wrench,
  XCircle,
  MapPin,
  Save,
  Pencil,
  Copy,
  Check,
  Dumbbell,
  Download,
  FileDown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
export const dynamic = 'force-dynamic'


/* ---------- constants ---------- */

const STATUS_OPTIONS = [
  { value: "available",    label: "Disponible" },
  { value: "in_use",       label: "En uso" },
  { value: "maintenance",  label: "Mantenimiento" },
  { value: "out_of_order", label: "Fuera de servicio" },
]

const EQUIPMENT_OPTIONS = [
  { value: "machine",         label: "Máquina" },
  { value: "free_weight",     label: "Peso libre" },
  { value: "cable",           label: "Cable" },
  { value: "bodyweight",      label: "Peso corporal" },
  { value: "cardio",          label: "Cardio" },
  { value: "resistance_band", label: "Banda elástica" },
]

const MUSCLE_OPTIONS = [
  { value: "chest",      label: "Pecho" },
  { value: "back",       label: "Espalda" },
  { value: "shoulders",  label: "Hombros" },
  { value: "biceps",     label: "Bíceps" },
  { value: "triceps",    label: "Tríceps" },
  { value: "arms",       label: "Brazos" },
  { value: "legs",       label: "Piernas" },
  { value: "glutes",     label: "Glúteos" },
  { value: "core",       label: "Core" },
  { value: "full_body",  label: "Cuerpo completo" },
  { value: "cardio",     label: "Cardio" },
]

const statusConfig: Record<string, {
  label: string; icon: React.ElementType; color: string; badgeClass: string
}> = {
  available:    { label: "Disponible",        icon: CheckCircle, color: "text-success",        badgeClass: "bg-success/10 text-success border-0" },
  in_use:       { label: "En uso",            icon: Dumbbell,    color: "text-blue-600",        badgeClass: "bg-blue-50 text-blue-700 border-0" },
  maintenance:  { label: "Mantenimiento",     icon: Wrench,      color: "text-amber-600",       badgeClass: "bg-amber-50 text-amber-700 border-0" },
  out_of_order: { label: "Fuera de servicio", icon: XCircle,     color: "text-destructive",     badgeClass: "bg-destructive/10 text-destructive border-0" },
}

/* ---------- interfaces ---------- */

interface QrCodeData {
  id: string
  code: string
  payload: string
  displayCode: string
  scansCount: number
  isActive: boolean
  lastScannedAt: string | null
}

interface MuscleGroup {
  value: string
  label: string
}

interface Machine {
  id: string
  name: string
  description: string | null
  status: string
  statusLabel: string
  equipmentType: string
  equipmentLabel: string
  muscleGroups: MuscleGroup[]
  location: string | null
  manufacturer: string | null
  model: string | null
  purchaseDate: string | null
  lastMaintenance: string | null
  imageUrl: string | null
  qrCode: QrCodeData | null
  exercises: { id: string; name: string }[]
  createdAt: string
}

interface Kpis {
  total: number
  available: number
  maintenance: number
  outOfOrder: number
}

interface CreateForm {
  name: string
  description: string
  equipmentType: string
  muscleGroups: string[]
  location: string
  status: string
}

interface EditForm {
  name: string
  description: string
  status: string
  equipmentType: string
  muscleGroups: string[]
  location: string
  manufacturer: string
  model: string
}

const EMPTY_CREATE: CreateForm = {
  name: "", description: "", equipmentType: "", muscleGroups: [], location: "", status: "available",
}

/* ---------- helpers ---------- */

function toggleMuscle(current: string[], value: string): string[] {
  return current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-"
  return new Date(dateStr).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" })
}

/* ---------- page ---------- */

export default function MachinesPage() {
  const [machines, setMachines] = useState<Machine[]>([])
  const [kpis, setKpis] = useState<Kpis | null>(null)
  const [loading, setLoading] = useState(true)

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [equipmentFilter, setEquipmentFilter] = useState<string>("todos")

  // QR dialog
  const [qrOpen, setQrOpen] = useState(false)
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null)
  const [copied, setCopied] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)

  // Create sheet
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE)
  const [createSaving, setCreateSaving] = useState(false)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Edit sheet
  const [editOpen, setEditOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", description: "", status: "available", equipmentType: "",
    muscleGroups: [], location: "", manufacturer: "", model: "",
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editSaved, setEditSaved] = useState(false)

  /* ---------- load ---------- */

  const loadMachines = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/machines")
      if (!res.ok) return
      const data = await res.json()
      setMachines(data.machines ?? [])
      setKpis(data.kpis ?? null)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadMachines() }, [loadMachines])

  // Generate real QR image when modal opens
  useEffect(() => {
    if (qrOpen && selectedMachine?.qrCode) {
      import("qrcode").then((m) => m.default).then((QRCode) =>
        QRCode.toDataURL(selectedMachine.qrCode!.payload ?? selectedMachine.qrCode!.code, {
          width: 240, margin: 2, color: { dark: "#000000", light: "#ffffff" },
        })
      ).then(setQrDataUrl).catch(() => setQrDataUrl(null))
    } else {
      setQrDataUrl(null)
    }
  }, [qrOpen, selectedMachine])

  /* ---------- filter ---------- */

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return machines.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(q) ||
        (m.location ?? "").toLowerCase().includes(q) ||
        m.muscleGroups.some((g) => g.label.toLowerCase().includes(q))
      const matchStatus = statusFilter === "todos" || m.status === statusFilter
      const matchEquip  = equipmentFilter === "todos" || m.equipmentType === equipmentFilter
      return matchSearch && matchStatus && matchEquip
    })
  }, [machines, search, statusFilter, equipmentFilter])

  /* ---------- create ---------- */

  function openCreate() {
    setCreateForm(EMPTY_CREATE)
    setCreateSuccess(false)
    setCreateOpen(true)
  }

  async function handleCreate() {
    if (!createForm.name.trim() || !createForm.equipmentType) return
    setCreateSaving(true)
    try {
      const res = await fetch("/api/admin/machines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: createForm.name,
          description: createForm.description || undefined,
          equipmentType: createForm.equipmentType,
          muscleGroups: createForm.muscleGroups,
          location: createForm.location || undefined,
          status: createForm.status,
        }),
      })
      if (!res.ok) return
      setCreateSuccess(true)
      await loadMachines()
    } catch {
      // silently fail
    } finally {
      setCreateSaving(false)
    }
  }

  /* ---------- edit ---------- */

  function openEdit(m: Machine) {
    setEditId(m.id)
    setEditForm({
      name: m.name,
      description: m.description ?? "",
      status: m.status,
      equipmentType: m.equipmentType,
      muscleGroups: m.muscleGroups.map((g) => g.value),
      location: m.location ?? "",
      manufacturer: m.manufacturer ?? "",
      model: m.model ?? "",
    })
    setEditSaved(false)
    setEditOpen(true)
  }

  async function handleEdit() {
    if (!editId) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/admin/machines/${editId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description || undefined,
          status: editForm.status,
          equipmentType: editForm.equipmentType,
          muscleGroups: editForm.muscleGroups,
          location: editForm.location || undefined,
          manufacturer: editForm.manufacturer || undefined,
          model: editForm.model || undefined,
        }),
      })
      if (!res.ok) return
      setEditSaved(true)
      await loadMachines()
    } catch {
      // silently fail
    } finally {
      setEditSaving(false)
    }
  }

  /* ---------- QR copy ---------- */

  function handleCopyQr() {
    const payload = selectedMachine?.qrCode?.payload ?? selectedMachine?.qrCode?.code
    if (!payload) return
    navigator.clipboard.writeText(payload)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
      .catch(() => {})
  }

  /* ---------- QR download (single PNG) ---------- */

  async function handleDownloadQr() {
    const machine = selectedMachine
    if (!machine?.qrCode) return
    setDownloading(true)
    try {
      const QRCode = (await import("qrcode")).default
      const qrPayload = machine.qrCode.payload ?? machine.qrCode.code
      const qrUrl = await QRCode.toDataURL(qrPayload, {
        width: 300, margin: 2, color: { dark: "#000000", light: "#ffffff" },
      })

      const canvas = document.createElement("canvas")
      canvas.width = 420
      canvas.height = 520
      const ctx = canvas.getContext("2d")!

      // White background
      ctx.fillStyle = "#ffffff"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Light border
      ctx.strokeStyle = "#e5e7eb"
      ctx.lineWidth = 2
      ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2)

      // QR image centered at top
      const img = new Image()
      await new Promise<void>((resolve) => { img.onload = () => resolve(); img.src = qrUrl })
      ctx.drawImage(img, 60, 30, 300, 300)

      // Machine name
      ctx.fillStyle = "#111827"
      ctx.font = "bold 20px system-ui, -apple-system, sans-serif"
      ctx.textAlign = "center"
      ctx.fillText(machine.name, canvas.width / 2, 370)

      // QR code string (monospace)
      ctx.fillStyle = "#6b7280"
      ctx.font = "13px 'Courier New', monospace"
      ctx.fillText(qrPayload, canvas.width / 2, 398)

      // Location
      if (machine.location) {
        ctx.fillStyle = "#9ca3af"
        ctx.font = "12px system-ui, -apple-system, sans-serif"
        ctx.fillText(machine.location, canvas.width / 2, 422)
      }

      // Footer
      ctx.fillStyle = "#d1d5db"
      ctx.font = "11px system-ui, -apple-system, sans-serif"
      ctx.fillText("Minthy Training", canvas.width / 2, 500)

      const link = document.createElement("a")
      link.href = canvas.toDataURL("image/png")
      link.download = `QR-${machine.name.replace(/\s+/g, "-")}-${machine.id}.png`
      link.click()
    } catch (err) {
      console.error("Error generating QR PNG:", err)
    } finally {
      setDownloading(false)
    }
  }

  /* ---------- PDF (all QR codes) ---------- */

  async function handleDownloadPdf() {
    if (machines.length === 0) return
    setPdfGenerating(true)
    try {
      const [QRCode, { jsPDF }] = await Promise.all([
        import("qrcode").then((m) => m.default),
        import("jspdf"),
      ])

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" })
      const pageW = 215.9
      const margin = 14
      const headerH = 22
      const cols = 2
      const rows = 3
      const cellW = (pageW - margin * 2) / cols
      const cellH = 76
      const qrSize = 48
      const dateStr = new Date().toLocaleDateString("es-EC", { day: "2-digit", month: "long", year: "numeric" })

      const drawHeader = (page: number) => {
        doc.setFontSize(13)
        doc.setFont("helvetica", "bold")
        doc.text("Minthy Training - Códigos QR de Máquinas", pageW / 2, margin, { align: "center" })
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")
        const pageLabel = page > 1 ? ` - Página ${page}` : ""
        doc.text(`Generado: ${dateStr}${pageLabel}`, pageW / 2, margin + 6, { align: "center" })
      }

      drawHeader(1)

      let col = 0
      let row = 0
      let pageNum = 1
      let cellsOnPage = 0

      for (const machine of machines) {
        if (!machine.qrCode) continue

        // New page when grid is full
        if (cellsOnPage > 0 && col === 0 && row === 0) {
          doc.addPage()
          pageNum++
          drawHeader(pageNum)
        }

        const x = margin + col * cellW
        const y = margin + headerH + row * cellH

        // Cell border
        doc.setDrawColor(229, 231, 235)
        doc.setLineWidth(0.3)
        doc.rect(x + 1, y + 1, cellW - 2, cellH - 2)

        const qrPayload = machine.qrCode.payload ?? machine.qrCode.code

        // QR image
        try {
          const qrUrl = await QRCode.toDataURL(qrPayload, {
            width: 160, margin: 1, color: { dark: "#000000", light: "#ffffff" },
          })
          doc.addImage(qrUrl, "PNG", x + (cellW - qrSize) / 2, y + 4, qrSize, qrSize)
        } catch { /* skip QR image on error */ }

        // Machine name
        doc.setFontSize(9)
        doc.setFont("helvetica", "bold")
        doc.text(machine.name, x + cellW / 2, y + qrSize + 10, { align: "center", maxWidth: cellW - 6 })

        // QR code string
        doc.setFontSize(7)
        doc.setFont("courier", "normal")
        doc.text(qrPayload, x + cellW / 2, y + qrSize + 17, { align: "center" })

        // Location
        if (machine.location) {
          doc.setFontSize(7)
          doc.setFont("helvetica", "normal")
          doc.text(machine.location, x + cellW / 2, y + qrSize + 23, { align: "center", maxWidth: cellW - 6 })
        }

        col++
        cellsOnPage++
        if (col >= cols) {
          col = 0
          row++
          if (row >= rows) {
            row = 0
            col = 0
            cellsOnPage = 0
          }
        }
      }

      const dateForFile = new Date().toISOString().split("T")[0]
      doc.save(`QR-Codes-MinthyTraining-${dateForFile}.pdf`)
    } catch (err) {
      console.error("Error generating PDF:", err)
    } finally {
      setPdfGenerating(false)
    }
  }

  /* ---------- render ---------- */

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground text-balance">Máquinas & QR</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {loading ? "Cargando..." : `${machines.length} máquinas registradas`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={pdfGenerating || machines.length === 0}
            className="gap-2"
          >
            <FileDown className="w-4 h-4" />
            {pdfGenerating ? "Generando PDF..." : "Descargar todos (PDF)"}
          </Button>
          <Button onClick={openCreate} className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva máquina
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
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
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-muted/30 shrink-0">
                  <Dumbbell className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.total ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "available" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "available" ? "todos" : "available")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 shrink-0">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.available ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Disponibles</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "maintenance" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "maintenance" ? "todos" : "maintenance")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-50 shrink-0">
                  <Wrench className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.maintenance ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Mantenimiento</p>
                </div>
              </CardContent>
            </Card>
            <Card
              className={`border border-border cursor-pointer transition-all hover:shadow-md ${statusFilter === "out_of_order" ? "ring-2 ring-primary" : ""}`}
              onClick={() => setStatusFilter(statusFilter === "out_of_order" ? "todos" : "out_of_order")}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-destructive/10 shrink-0">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{kpis?.outOfOrder ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Fuera servicio</p>
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
            placeholder="Buscar nombre, ubicación o músculo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los tipos</SelectItem>
            {EQUIPMENT_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Machines Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border border-border">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-24 mt-1" />
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 mb-4">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1 rounded-md" />
                  <Skeleton className="h-8 flex-1 rounded-md" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <QrCode className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No se encontraron máquinas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((machine) => {
            const cfg = statusConfig[machine.status] ?? statusConfig.out_of_order
            return (
              <Card key={machine.id} className="border border-border hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                      {machine.name}
                    </CardTitle>
                    <Badge className={`${cfg.badgeClass} shrink-0`}>{cfg.label}</Badge>
                  </div>
                  <Badge variant="outline" className="w-fit text-xs mt-1">
                    {machine.equipmentLabel}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2 mb-4">
                    {machine.location && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        {machine.location}
                      </div>
                    )}
                    {machine.muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {machine.muscleGroups.slice(0, 3).map((g) => (
                          <span
                            key={g.value}
                            className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium bg-primary/8 text-primary"
                          >
                            {g.label}
                          </span>
                        ))}
                        {machine.muscleGroups.length > 3 && (
                          <span className="text-[10px] text-muted-foreground self-center">
                            +{machine.muscleGroups.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {machine.qrCode && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono truncate">{machine.qrCode.displayCode}</span>
                        <span className="shrink-0 text-[10px]">({machine.qrCode.scansCount} scans)</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => { setSelectedMachine(machine); setCopied(false); setQrOpen(true) }}
                      disabled={!machine.qrCode}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      Ver QR
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1"
                      onClick={() => openEdit(machine)}
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
      )}

      {/* QR Dialog */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Código QR</DialogTitle>
          </DialogHeader>
          {selectedMachine?.qrCode && (
            <div className="flex flex-col items-center gap-4 py-4">
              {/* QR Image - real generated code */}
              <div className="w-52 h-52 rounded-xl border border-border flex items-center justify-center bg-white p-2 shadow-sm">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrDataUrl} alt={`QR: ${selectedMachine.qrCode.payload}`} className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <QrCode className="w-14 h-14 text-muted-foreground animate-pulse" />
                    <p className="text-xs text-muted-foreground">Generando...</p>
                  </div>
                )}
              </div>

              {/* Machine info */}
              <div className="text-center w-full">
                <p className="text-sm font-semibold text-foreground">{selectedMachine.name}</p>
                {selectedMachine.location && (
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedMachine.location}</p>
                )}
                <div className="mt-2 flex flex-col gap-1 text-left rounded-lg border border-border bg-muted/30 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Payload QR</p>
                  <p className="text-xs font-mono break-all text-foreground">{selectedMachine.qrCode.payload}</p>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">Identificador de máquina</p>
                  <p className="text-xs font-mono text-foreground">{selectedMachine.id}</p>
                  {selectedMachine.qrCode.code !== selectedMachine.qrCode.payload && (
                    <>
                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground mt-1">Código legacy almacenado</p>
                      <p className="text-xs font-mono break-all text-muted-foreground">{selectedMachine.qrCode.code}</p>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-center gap-4 mt-1.5 text-xs text-muted-foreground">
                  <span>{selectedMachine.qrCode.scansCount} escaneos</span>
                  {selectedMachine.qrCode.lastScannedAt && (
                    <span>Último: {formatDate(selectedMachine.qrCode.lastScannedAt)}</span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 w-full">
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleCopyQr}
                >
                  {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  {copied ? "¡Copiado!" : "Copiar payload"}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 gap-2"
                  onClick={handleDownloadQr}
                  disabled={downloading || !qrDataUrl}
                >
                  <Download className="w-4 h-4" />
                  {downloading ? "..." : "Descargar QR"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Sheet */}
      <Sheet open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setCreateSuccess(false) } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nueva Máquina</SheetTitle>
          </SheetHeader>

          {createSuccess ? (
            <div className="mt-10 flex flex-col items-center gap-4 text-center">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">¡Máquina creada!</p>
              <p className="text-sm text-muted-foreground">Se generó el código QR automáticamente.</p>
              <Button className="mt-2 w-full" onClick={() => { setCreateOpen(false); setCreateSuccess(false) }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Nombre <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="ej. Press de Banca"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Descripción</Label>
                <Textarea
                  placeholder="Descripción de la máquina..."
                  value={createForm.description}
                  onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tipo de equipo <span className="text-destructive">*</span></Label>
                <Select
                  value={createForm.equipmentType}
                  onValueChange={(val) => setCreateForm((p) => ({ ...p, equipmentType: val }))}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Grupos musculares</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MUSCLE_OPTIONS.map((o) => (
                    <div key={o.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`c-${o.value}`}
                        checked={createForm.muscleGroups.includes(o.value)}
                        onCheckedChange={() =>
                          setCreateForm((p) => ({ ...p, muscleGroups: toggleMuscle(p.muscleGroups, o.value) }))
                        }
                      />
                      <label htmlFor={`c-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Ubicación</Label>
                <Input
                  placeholder="ej. Zona A"
                  value={createForm.location}
                  onChange={(e) => setCreateForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado inicial</Label>
                <Select
                  value={createForm.status}
                  onValueChange={(val) => setCreateForm((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <Button
                className="w-full gap-2"
                onClick={handleCreate}
                disabled={!createForm.name.trim() || !createForm.equipmentType || createSaving}
              >
                <Plus className="w-4 h-4" />
                {createSaving ? "Creando..." : "Crear máquina"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Sheet */}
      <Sheet open={editOpen} onOpenChange={(open) => { if (!open) { setEditOpen(false); setEditSaved(false) } }}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Máquina</SheetTitle>
          </SheetHeader>

          {editSaved ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-success/10">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <p className="text-lg font-semibold text-foreground">Cambios guardados</p>
              <Button variant="outline" onClick={() => { setEditOpen(false); setEditSaved(false) }}>
                Cerrar
              </Button>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Nombre</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Descripción</Label>
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  rows={2}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Estado</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, status: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Tipo de equipo</Label>
                <Select
                  value={editForm.equipmentType}
                  onValueChange={(val) => setEditForm((p) => ({ ...p, equipmentType: val }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Grupos musculares</Label>
                <div className="grid grid-cols-2 gap-2">
                  {MUSCLE_OPTIONS.map((o) => (
                    <div key={o.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`e-${o.value}`}
                        checked={editForm.muscleGroups.includes(o.value)}
                        onCheckedChange={() =>
                          setEditForm((p) => ({ ...p, muscleGroups: toggleMuscle(p.muscleGroups, o.value) }))
                        }
                      />
                      <label htmlFor={`e-${o.value}`} className="text-sm cursor-pointer">{o.label}</label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Ubicación</Label>
                <Input
                  value={editForm.location}
                  onChange={(e) => setEditForm((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Fabricante</Label>
                <Input
                  value={editForm.manufacturer}
                  onChange={(e) => setEditForm((p) => ({ ...p, manufacturer: e.target.value }))}
                  placeholder="ej. Technogym"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Modelo</Label>
                <Input
                  value={editForm.model}
                  onChange={(e) => setEditForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="ej. Pure Strength"
                />
              </div>
              <Separator />
              <Button
                className="w-full gap-2"
                onClick={handleEdit}
                disabled={!editForm.name.trim() || editSaving}
              >
                <Save className="w-4 h-4" />
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}




