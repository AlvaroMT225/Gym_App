"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  RotateCcw,
  Play,
  Pause,
  Trophy,
  Target,
  Zap,
  Plus,
  Check,
  Timer,
  Dumbbell,
  AlertTriangle,
  BookOpen,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { getMachineById } from "@/lib/mock-data"
import { useStore } from "@/lib/store"
import { formatDateShort } from "@/lib/utils"

interface MachinePanelProps {
  machineId: string
}

export function MachinePanel({ machineId }: MachinePanelProps) {
  const machine = getMachineById(machineId)
  const {
    sessions,
    addSession,
    tutorialsSeen,
    markTutorialSeen,
    challenges,
  } = useStore()

  // Get history for this machine from the store
  const history = useMemo(() => {
    return sessions
      .filter((s) => s.machineId === machineId)
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
  }, [sessions, machineId])

  // Last set from last session
  const lastSet = useMemo(() => {
    if (history.length === 0) return null
    const lastSession = history[0]
    if (lastSession.sets.length === 0) return null
    return lastSession.sets[lastSession.sets.length - 1]
  }, [history])

  // PR for this machine
  const pr = useMemo(() => {
    let best: { weight: number; reps: number; rpe: number; date: string } | null =
      null
    for (const s of history) {
      for (const set of s.sets) {
        if (!best || set.weight > best.weight) {
          best = {
            weight: set.weight,
            reps: set.reps,
            rpe: set.rpe,
            date: s.date,
          }
        }
      }
    }
    return best
  }, [history])

  const machineChallenge = challenges[0]

  // Tutorial state from store
  const isTutorialSeen = tutorialsSeen[machineId] || false
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    if (machine && !isTutorialSeen) {
      setShowTutorial(true)
    }
  }, [machine, isTutorialSeen])

  const handleTutorialDone = () => {
    markTutorialSeen(machineId)
    setShowTutorial(false)
  }

  // Rest timer
  const [restTimer, setRestTimer] = useState(0)
  const [timerActive, setTimerActive] = useState(false)
  const [timerPreset, setTimerPreset] = useState(90)

  // Session sets collected
  const [sessionSets, setSessionSets] = useState<
    { weight: number; reps: number; rpe: number }[]
  >([])
  const [sessionDone, setSessionDone] = useState(false)

  // Form state for new set
  const [weight, setWeight] = useState(lastSet?.weight || 20)
  const [reps, setReps] = useState(lastSet?.reps || 10)
  const [rpe, setRpe] = useState(lastSet?.rpe || 7)

  // Update form when lastSet changes (e.g. on mount)
  useEffect(() => {
    if (lastSet) {
      setWeight(lastSet.weight)
      setReps(lastSet.reps)
      setRpe(lastSet.rpe)
    }
  }, [lastSet])

  // Rest timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (timerActive && restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => {
          if (prev <= 1) {
            setTimerActive(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [timerActive, restTimer])

  const startTimer = useCallback(
    (seconds = 90) => {
      setTimerPreset(seconds)
      setRestTimer(seconds)
      setTimerActive(true)
    },
    []
  )

  const handleRepeatLastSet = () => {
    if (lastSet) {
      setSessionSets((prev) => [
        ...prev,
        { weight: lastSet.weight, reps: lastSet.reps, rpe: lastSet.rpe },
      ])
      // Auto-start timer
      startTimer(90)
    }
  }

  const handleSaveSet = () => {
    setSessionSets((prev) => [...prev, { weight, reps, rpe }])
    // Auto-start timer
    startTimer(90)
  }

  const finishSession = () => {
    if (sessionSets.length === 0) return
    addSession({
      date: new Date().toISOString(),
      machineId,
      sets: sessionSets,
      source: "qr",
    })
    setSessionDone(true)
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, "0")}`
  }

  if (!machine) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">
            Maquina no encontrada
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            No se encontro la maquina con ID: {machineId}
          </p>
          <Link href="/dashboard/scan">
            <Button>Volver a escanear</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Tutorial modal (first time) — BLOCKS registration */}
      <Dialog
        open={showTutorial}
        onOpenChange={(open) => {
          // Prevent closing without accepting
          if (!open && !isTutorialSeen) return
          setShowTutorial(open)
        }}
      >
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              Tutorial: {machine.name}
            </DialogTitle>
            <DialogDescription>
              Es tu primera vez en esta maquina. Revisa la guia antes de
              empezar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Pasos de uso:
              </h4>
              <ol className="flex flex-col gap-1.5">
                {[
                  "Ajusta el asiento a tu altura",
                  "Selecciona el peso adecuado",
                  "Manten la espalda recta",
                  "Movimiento completo y controlado",
                  "Exhala en fase concentrica",
                ].map((step, i) => (
                  <li
                    key={`step-${step}`}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Seguridad:
              </h4>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                <li>- No uses peso excesivo en tus primeras sesiones</li>
                <li>- Si sientes dolor articular, detente</li>
                <li>- Pide ayuda a un instructor si tienes dudas</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleTutorialDone} className="w-full">
              <Check className="w-4 h-4 mr-2" />
              Entendido, registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/scan">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-foreground">
              {machine.name}
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {machine.id}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {machine.muscles.join(" / ")}
          </p>
        </div>
      </div>

      {/* Reward modal */}
      <Dialog open={sessionDone} onOpenChange={setSessionDone}>
        <DialogContent className="sm:max-w-sm text-center">
          <div className="flex flex-col items-center py-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-4">
              <Zap className="w-8 h-8 text-accent" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              Sesion Completada
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {sessionSets.length} sets registrados en {machine.name}
            </p>
            <div className="flex items-center gap-3 mb-4">
              <Badge className="bg-primary text-primary-foreground">
                +50 puntos
              </Badge>
              <Badge className="bg-accent text-accent-foreground">
                Racha: 5 dias
              </Badge>
            </div>
            <Link href="/dashboard" className="w-full">
              <Button className="w-full">Volver al Home</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Last Workout */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" />
              Ultimo entrenamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lastSet ? (
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-lg font-bold text-foreground">
                      {lastSet.weight} kg
                    </p>
                    <p className="text-xs text-muted-foreground">Peso</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-lg font-bold text-foreground">
                      {lastSet.reps}
                    </p>
                    <p className="text-xs text-muted-foreground">Reps</p>
                  </div>
                  <div className="bg-muted rounded-lg p-3">
                    <p className="text-lg font-bold text-foreground">
                      {lastSet.rpe}
                    </p>
                    <p className="text-xs text-muted-foreground">RPE</p>
                  </div>
                </div>
                {lastSet.notes && (
                  <p className="text-xs text-muted-foreground italic">
                    {'"'}
                    {lastSet.notes}
                    {'"'}
                  </p>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-2 bg-transparent"
                  onClick={handleRepeatLastSet}
                  disabled={!isTutorialSeen}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Repetir ultimo set
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sin historial en esta maquina
              </p>
            )}
          </CardContent>
        </Card>

        {/* Register New Set */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" />
              Registrar set actual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Peso (kg)
                  </label>
                  <input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={reps}
                    onChange={(e) => setReps(Number(e.target.value))}
                    min={1}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm text-center font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    RPE
                  </label>
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
              <Button
                onClick={handleSaveSet}
                className="w-full"
                disabled={!isTutorialSeen}
              >
                <Plus className="w-4 h-4 mr-2" />
                Guardar set
              </Button>
              {sessionSets.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {sessionSets.map((set, i) => (
                    <div
                      key={`session-set-${i}-${set.weight}`}
                      className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium text-foreground">
                          {set.weight}kg x {set.reps}
                        </span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        RPE {set.rpe}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Rest Timer */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Timer className="w-4 h-4 text-primary" />
              Timer de descanso
              {timerActive && (
                <Badge className="bg-primary/10 text-primary border-0 text-xs animate-pulse">
                  Activo
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-center justify-center w-24 h-24 rounded-full border-4 border-primary/20 relative">
                <span className="text-2xl font-bold text-foreground font-mono">
                  {formatTime(restTimer)}
                </span>
                {timerActive && (
                  <svg
                    className="absolute inset-0 w-full h-full -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="46"
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="4"
                      strokeDasharray={`${(restTimer / timerPreset) * 289} 289`}
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </div>
              <div className="flex items-center gap-2">
                {[60, 90, 120].map((sec) => (
                  <Button
                    key={sec}
                    variant="outline"
                    size="sm"
                    onClick={() => startTimer(sec)}
                    className={`text-xs bg-transparent ${
                      timerPreset === sec && timerActive
                        ? "border-primary text-primary"
                        : ""
                    }`}
                  >
                    {sec}s
                  </Button>
                ))}
                {timerActive ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setTimerActive(false)
                      setRestTimer(0)
                    }}
                  >
                    <Pause className="w-3 h-3 mr-1" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => startTimer(90)}
                    disabled={timerActive}
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Iniciar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* PRs */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              PR en esta maquina
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pr ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-accent/15">
                  <Trophy className="w-7 h-7 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">
                    {pr.weight} kg
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {pr.reps} reps @ RPE {pr.rpe}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateShort(pr.date)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aun sin records en esta maquina
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Mission / Challenge */}
        <Card className="border border-border hover:shadow-md transition-all duration-200 lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Mision / Reto activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="flex-1">
                <h4 className="text-base font-semibold text-foreground">
                  {machineChallenge.title}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {machineChallenge.description}
                </p>
              </div>
              <div className="flex-shrink-0 w-full sm:w-48">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>
                    {machineChallenge.progress} / {machineChallenge.goal}{" "}
                    {machineChallenge.unit}
                  </span>
                  <span>
                    {Math.round(
                      (machineChallenge.progress / machineChallenge.goal) * 100
                    )}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (machineChallenge.progress / machineChallenge.goal) * 100
                  }
                  className="h-2"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Finish session */}
      {sessionSets.length > 0 && (
        <div className="mt-6">
          <Button onClick={finishSession} size="lg" className="w-full text-base">
            <Dumbbell className="w-5 h-5 mr-2" />
            Finalizar sesion ({sessionSets.length} sets)
          </Button>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Historial en esta maquina
          </h3>
          <div className="flex flex-col gap-2">
            {history.slice(0, 5).map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    {session.sets
                      .map((s) => `${s.weight}kg x ${s.reps}`)
                      .join(", ")}
                  </span>
                  <Badge
                    className={`text-xs border-0 ${
                      session.source === "qr"
                        ? "bg-primary/10 text-primary"
                        : "bg-muted-foreground/10 text-muted-foreground"
                    }`}
                  >
                    {session.source === "qr" ? "QR" : "Manual"}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDateShort(session.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
