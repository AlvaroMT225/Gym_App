"use client"

import { useState, useMemo } from "react"
import {
  BookOpen,
  Search,
  Dumbbell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Play,
  ShieldAlert,
  XCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { tutorials, machines } from "@/lib/mock-data"
import { useStore } from "@/lib/store"

const commonErrors: Record<string, string[]> = {
  "SMITH-01": [
    "Bloquear las rodillas en extension completa",
    "Arquear excesivamente la espalda baja",
    "Usar peso sin tener el seguro puesto",
  ],
  "POLEA-01": [
    "Usar momentum en lugar de control muscular",
    "No mantener los codos pegados al cuerpo en remo",
    "Tirar con los brazos en vez de la espalda",
  ],
  "APERT-01": [
    "Abrir demasiado y sobrecargar el hombro",
    "No controlar la fase excentrica (regreso)",
    "Elevar los hombros durante el movimiento",
  ],
  "ABDUC-01": [
    "Levantar la cadera del asiento",
    "Usar peso excesivo perdiendo rango de movimiento",
    "Movimientos bruscos en vez de controlados",
  ],
  "CUADR-01": [
    "Hiperextender la rodilla al final del movimiento",
    "Levantar la espalda del respaldo",
    "No bajar completamente (rango parcial)",
  ],
  "FEMOR-01": [
    "Levantar la cadera del banco",
    "Usar impulso para subir el peso",
    "No llegar al rango completo de flexion",
  ],
}

export function TutorialsView() {
  const { tutorialsSeen, markTutorialSeen } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMachine, setSelectedMachine] = useState<string | null>(null)

  const filteredMachines = useMemo(() => {
    if (!searchQuery.trim()) return machines
    const q = searchQuery.toLowerCase()
    return machines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.muscles.some((mu) => mu.toLowerCase().includes(q))
    )
  }, [searchQuery])

  const selectedTutorial = useMemo(() => {
    if (!selectedMachine) return null
    return tutorials.find((t) => t.machineId === selectedMachine) || null
  }, [selectedMachine])

  const machine = selectedMachine ? machines.find((m) => m.id === selectedMachine) : null

  const seenCount = Object.keys(tutorialsSeen).filter((k) => tutorialsSeen[k]).length

  if (selectedMachine && selectedTutorial && machine) {
    const isSeen = tutorialsSeen[selectedMachine] || false
    const errors = commonErrors[selectedMachine] || [
      "Usar peso excesivo sin tecnica correcta",
      "No calentar antes de usar la maquina",
      "Movimientos bruscos sin control",
    ]

    return (
      <div className="flex flex-col gap-4">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedMachine(null)} className="self-start -ml-2">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Volver a lista
        </Button>

        {/* Machine header */}
        <Card className="border border-border">
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 shrink-0">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-foreground">{machine.name}</h2>
                <Badge className={`border-0 text-xs ${isSeen ? "bg-primary/10 text-primary" : "bg-accent/15 text-accent"}`}>
                  {isSeen ? "Visto" : "Pendiente"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{machine.muscles.join(", ")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Video placeholder */}
        <Card className="border border-border overflow-hidden">
          <div className="relative bg-foreground/5 flex items-center justify-center h-48">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/15">
                <Play className="w-7 h-7 text-primary ml-0.5" />
              </div>
              <p className="text-xs">Video tutorial (demo)</p>
            </div>
          </div>
        </Card>

        {/* Technique steps */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Tecnica correcta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col gap-2.5">
              {selectedTutorial.steps.map((step, i) => (
                <li key={`step-${i}`} className="flex items-start gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        {/* Safety */}
        <Card className="border border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-4 h-4" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {selectedTutorial.safetyTips.map((tip, i) => (
                <li key={`safety-${i}`} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{tip}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Common errors */}
        <Card className="border border-accent/20 bg-accent/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-accent">
              <XCircle className="w-4 h-4" />
              Errores comunes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2">
              {errors.map((err, i) => (
                <li key={`err-${i}`} className="flex items-start gap-2">
                  <XCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                  <p className="text-sm text-foreground">{err}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Mark as seen */}
        {!isSeen && (
          <Button onClick={() => markTutorialSeen(selectedMachine)} size="lg" className="w-full">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            Marcar como visto
          </Button>
        )}
      </div>
    )
  }

  // Machine list view
  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <Card className="border border-border">
        <CardContent className="flex items-center gap-4 py-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{seenCount} de {machines.length} tutoriales vistos</p>
            <p className="text-xs text-muted-foreground">Completa todos los tutoriales para un entrenamiento seguro</p>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar maquina..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Machine list */}
      <div className="flex flex-col gap-2">
        {filteredMachines.map((m) => {
          const isSeen = tutorialsSeen[m.id] || false
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelectedMachine(m.id)}
              className="text-left"
            >
              <Card className="group cursor-pointer border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors shrink-0">
                    <Dumbbell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-foreground">{m.name}</h4>
                    <p className="text-xs text-muted-foreground">{m.muscles.join(", ")}</p>
                  </div>
                  {isSeen ? (
                    <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Visto
                    </Badge>
                  ) : (
                    <Badge className="bg-accent/15 text-accent border-0 text-xs shrink-0">
                      <Clock className="w-3 h-3 mr-1" />
                      Pendiente
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
    </div>
  )
}
