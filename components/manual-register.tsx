"use client"

import { useState, useMemo } from "react"
import {
  ClipboardList,
  Search,
  Dumbbell,
  Plus,
  Save,
  ArrowRight,
  ScanLine,
  X,
  ChevronDown,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { machines } from "@/lib/mock-data"
import { useStore } from "@/lib/store"
import { formatDateShort } from "@/lib/utils"

interface SetEntry {
  weight: number
  reps: number
  rpe: number
  timeSec?: number
  notes?: string
}

export function ManualRegister() {
  const { sessions, addSession } = useStore()
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentSets, setCurrentSets] = useState<SetEntry[]>([])
  const [sessionSaved, setSessionSaved] = useState(false)

  // Form state
  const [weight, setWeight] = useState(20)
  const [reps, setReps] = useState(10)
  const [rpe, setRpe] = useState(7)
  const [timeSec, setTimeSec] = useState<number | undefined>(undefined)
  const [notes, setNotes] = useState("")
  const [showTimeNotes, setShowTimeNotes] = useState(false)

  const filteredMachines = useMemo(() => {
    if (!searchQuery.trim()) return machines
    const q = searchQuery.toLowerCase()
    return machines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.muscles.some((mu) => mu.toLowerCase().includes(q)) ||
        m.category.toLowerCase().includes(q)
    )
  }, [searchQuery])

  const machine = machines.find((m) => m.id === selectedMachine)

  // Get history for selected machine from sessions store
  const machineHistory = useMemo(() => {
    if (!selectedMachine) return []
    return sessions
      .filter((s) => s.machineId === selectedMachine)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [sessions, selectedMachine])

  // Last set suggestion
  const lastSet = useMemo(() => {
    if (machineHistory.length === 0) return null
    const lastSession = machineHistory[0]
    if (lastSession.sets.length === 0) return null
    return lastSession.sets[lastSession.sets.length - 1]
  }, [machineHistory])

  // Prefill from last set when selecting machine
  const handleSelectMachine = (machineId: string) => {
    setSelectedMachine(machineId)
    setCurrentSets([])
    setSessionSaved(false)
    // Find last set for this machine
    const hist = sessions
      .filter((s) => s.machineId === machineId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    if (hist.length > 0 && hist[0].sets.length > 0) {
      const last = hist[0].sets[hist[0].sets.length - 1]
      setWeight(last.weight)
      setReps(last.reps)
      setRpe(last.rpe)
    } else {
      setWeight(20)
      setReps(10)
      setRpe(7)
    }
    setTimeSec(undefined)
    setNotes("")
    setShowTimeNotes(false)
  }

  const handleAddSet = () => {
    const newSet: SetEntry = { weight, reps, rpe }
    if (timeSec && timeSec > 0) newSet.timeSec = timeSec
    if (notes.trim()) newSet.notes = notes.trim()
    setCurrentSets((prev) => [...prev, newSet])
    setNotes("")
    setTimeSec(undefined)
  }

  const handleRemoveSet = (index: number) => {
    setCurrentSets((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveSession = () => {
    if (currentSets.length === 0 || !selectedMachine) return
    addSession({
      date: new Date().toISOString(),
      machineId: selectedMachine,
      sets: currentSets,
      source: "manual",
    })
    setSessionSaved(true)
    setCurrentSets([])
  }

  const handleNewSession = () => {
    setSelectedMachine(null)
    setSessionSaved(false)
    setCurrentSets([])
    setSearchQuery("")
  }

  return (
    <div className="flex flex-col gap-6">
      {/* QR Nudge banner */}
      <Link href="/dashboard/scan">
        <Card className="border border-primary/20 bg-primary/5 shadow-none hover:bg-primary/10 transition-colors cursor-pointer group">
          <CardContent className="flex items-center gap-3 py-3">
            <ScanLine className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm text-foreground flex-1">
              <span className="font-semibold">Registro express por QR es 10x mas rapido.</span>{" "}
              <span className="text-muted-foreground">Escanea el QR de la maquina.</span>
            </p>
            <ArrowRight className="w-4 h-4 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>
      </Link>

      {/* Session saved feedback */}
      {sessionSaved && (
        <Card className="border-2 border-primary bg-primary/5">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-4">
              <Save className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">Sesion guardada</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Registrada como <Badge variant="secondary" className="font-mono text-xs">manual</Badge>
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Las sesiones manuales no cuentan para retos ni rankings. Usa QR para que cuenten.
            </p>
            <div className="flex gap-3">
              <Button onClick={handleNewSession} variant="outline" className="bg-transparent">Nueva sesion</Button>
              <Link href="/dashboard/scan">
                <Button><ScanLine className="w-4 h-4 mr-2" />Ir a escanear</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Machine selector */}
      {!sessionSaved && !selectedMachine && (
        <div className="flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar maquina por nombre o musculo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Machine list */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filteredMachines.map((m) => (
              <button
                type="button"
                key={m.id}
                onClick={() => handleSelectMachine(m.id)}
                className="text-left"
              >
                <Card className="group cursor-pointer border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground truncate">{m.name}</h4>
                      <p className="text-xs text-muted-foreground">{m.muscles.join(", ")}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </CardContent>
                </Card>
              </button>
            ))}
            {filteredMachines.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-2 text-center py-8">
                No se encontraron maquinas con ese filtro.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Registration form for selected machine */}
      {!sessionSaved && selectedMachine && machine && (
        <div className="flex flex-col gap-4">
          {/* Machine header */}
          <Card className="border border-border">
            <CardContent className="flex items-center gap-3 py-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">{machine.name}</h3>
                <p className="text-xs text-muted-foreground">{machine.muscles.join(", ")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={handleNewSession} className="shrink-0">
                Cambiar
              </Button>
            </CardContent>
          </Card>

          {/* Quick History */}
          {machineHistory.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-primary" />
                  Historial rapido
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {machineHistory.map((session) => (
                  <div key={session.id} className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground font-medium">
                        {session.sets.map((s) => `${s.weight}kg x${s.reps}`).join(", ")}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-xs border-0 ${session.source === "qr" ? "bg-primary/10 text-primary" : "bg-muted-foreground/10 text-muted-foreground"}`}
                      >
                        {session.source === "qr" ? "QR" : "Manual"}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateShort(session.date)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Last set suggestion */}
          {lastSet && (
            <Card className="border border-dashed border-primary/30 bg-primary/5 shadow-none">
              <CardContent className="py-3">
                <p className="text-xs text-muted-foreground mb-1">Ultimo set sugerido (prerellenado):</p>
                <p className="text-sm font-semibold text-foreground">
                  {lastSet.weight} kg x {lastSet.reps} reps @ RPE {lastSet.rpe}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Set form */}
          <Card className="border border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary" />
                Nuevo set
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Peso (kg)</label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">RPE</label>
                  <input
                    type="number"
                    value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              {/* Toggle for time & notes */}
              <button
                type="button"
                onClick={() => setShowTimeNotes(!showTimeNotes)}
                className="flex items-center gap-1 text-xs text-primary font-medium hover:underline"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showTimeNotes ? "rotate-180" : ""}`} />
                {showTimeNotes ? "Ocultar" : "Tiempo y notas (opcional)"}
              </button>

              {showTimeNotes && (
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Tiempo (segundos)</label>
                    <input
                      type="number"
                      value={timeSec ?? ""}
                      onChange={(e) => setTimeSec(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="Ej: 45"
                      min={0}
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Notas</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ej: Buen control excentrico"
                      className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              )}

              <Button onClick={handleAddSet} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Anadir set
              </Button>
            </CardContent>
          </Card>

          {/* Current session sets */}
          {currentSets.length > 0 && (
            <Card className="border border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Sets de esta sesion ({currentSets.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {currentSets.map((set, index) => (
                  <div
                    key={`set-${index}-${set.weight}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {set.weight} kg x {set.reps} reps
                      </span>
                      <Badge variant="secondary" className="text-xs">RPE {set.rpe}</Badge>
                      {set.timeSec && (
                        <span className="text-xs text-muted-foreground">{set.timeSec}s</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSet(index)}
                      className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label="Eliminar set"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <Button onClick={handleSaveSession} className="w-full mt-2" size="lg">
                  <Save className="w-4 h-4 mr-2" />
                  Guardar sesion ({currentSets.length} sets)
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
