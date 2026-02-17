"use client"

import Link from "next/link"
import {
  ScanLine,
  Flame,
  Trophy,
  Dumbbell,
  Target,
  Gift,
  CreditCard,
  ArrowRight,
  TrendingUp,
  Zap,
  Clock,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  currentUser,
  machines,
  setHistory,
  challenges,
  promos,
  achievements,
  gymSchedule,
} from "@/lib/mock-data"
import { formatNumber, formatDateLong } from "@/lib/utils"
import { ScanCtaBanner } from "@/components/scan-cta-banner"
import { PlannedSessionsClientView } from "@/components/planned-sessions-client-view"
import { useAuth } from "@/lib/auth/auth-context"

export function HomeDashboard() {
  const { user: authUser } = useAuth()
  const todaySets = setHistory.filter(
    (s) =>
      new Date(s.date).toDateString() === new Date("2026-02-09").toDateString()
  )
  const weeklyVolume = setHistory.reduce((acc, s) => acc + s.weight * s.reps, 0)
  const unlockedAchievements = achievements.filter((a) => a.unlocked)
  const activeChallenge = challenges[0]
  const activePromo = promos[0]

  // Gym schedule logic
  const today = new Date().toLocaleDateString("es-ES", { weekday: "long" })
  const todaySchedule = gymSchedule.find(
    (s) => s.day.toLowerCase() === today.toLowerCase()
  )
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  let isOpen = false
  let closesInHours = 0
  let opensAt = ""
  if (todaySchedule) {
    const [openH, openM] = todaySchedule.open.split(":").map(Number)
    const [closeH, closeM] = todaySchedule.close.split(":").map(Number)
    const openMinutes = openH * 60 + openM
    const closeMinutes = closeH * 60 + closeM
    isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes
    closesInHours = Math.floor((closeMinutes - currentMinutes) / 60)
    opensAt = todaySchedule.open
  }

  const paymentStatusColors = {
    al_dia: "bg-success/10 text-success",
    por_vencer: "bg-accent/15 text-accent",
    vencido: "bg-destructive/10 text-destructive",
  }
  const paymentStatusLabels = {
    al_dia: "Al dia",
    por_vencer: "Por vencer",
    vencido: "Vencido",
  }

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Smart CTA notification */}
      <ScanCtaBanner />

      {/* Greeting */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground text-balance">
          Hola, {authUser?.name.split(" ")[0] || currentUser.name.split(" ")[0]}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Listo para entrenar hoy. Tu racha actual es de {currentUser.scanStreak} dias.
        </p>
      </div>

      {/* Gym Schedule Strip */}
      {todaySchedule && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg bg-muted/50 border border-border">
          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            {isOpen ? (
              <p className="text-sm text-foreground">
                <span className="font-medium text-success">Abierto</span>
                {" · "}Hoy {todaySchedule.open}–{todaySchedule.close}
                {" · "}<span className="text-muted-foreground">Cierra en {closesInHours}h</span>
              </p>
            ) : (
              <p className="text-sm text-foreground">
                <span className="font-medium text-destructive">Cerrado</span>
                {" · "}<span className="text-muted-foreground">Abre a las {opensAt}</span>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Scan CTA Banner */}
      <Link href="/dashboard/scan">
        <Card className="mb-6 border-0 bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 cursor-pointer group">
          <CardContent className="flex items-center gap-4 py-5">
            <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary-foreground/15 group-hover:bg-primary-foreground/25 transition-colors">
              <ScanLine className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold">Escanea tu proxima maquina</h2>
              <p className="text-sm opacity-80">
                Registro express por QR - 10x mas rapido
              </p>
            </div>
            <ArrowRight className="w-5 h-5 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </CardContent>
        </Card>
      </Link>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Scan Streak */}
        <Card className="border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{currentUser.scanStreak}</p>
            <p className="text-xs text-muted-foreground">Racha de escaneo</p>
          </CardContent>
        </Card>

        {/* Points */}
        <Card className="border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(currentUser.totalPoints)}</p>
            <p className="text-xs text-muted-foreground">Puntos totales</p>
          </CardContent>
        </Card>

        {/* Sets Today */}
        <Card className="border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{todaySets.length}</p>
            <p className="text-xs text-muted-foreground">Sets hoy</p>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="border border-border hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{unlockedAchievements.length}/{achievements.length}</p>
            <p className="text-xs text-muted-foreground">Logros</p>
          </CardContent>
        </Card>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Weekly Volume */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volumen semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-foreground">{formatNumber(weeklyVolume)} kg</p>
            <p className="text-xs text-muted-foreground mt-1">Total peso x repeticiones</p>
            <div className="mt-3 flex items-center gap-2">
              <Progress value={65} className="h-2 flex-1" />
              <span className="text-xs text-muted-foreground">65% de tu meta</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Mission */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Mision del dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="text-base font-semibold text-foreground">{activeChallenge.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{activeChallenge.description}</p>
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>
                  {activeChallenge.progress}/{activeChallenge.goal} {activeChallenge.unit}
                </span>
                <span>{Math.round((activeChallenge.progress / activeChallenge.goal) * 100)}%</span>
              </div>
              <Progress
                value={(activeChallenge.progress / activeChallenge.goal) * 100}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Active Promo */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gift className="w-4 h-4 text-accent" />
              Promo activa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="text-base font-semibold text-foreground">{activePromo.title}</h4>
            <p className="text-xs text-muted-foreground mt-1">{activePromo.description}</p>
            {activePromo.code && (
              <Badge variant="secondary" className="mt-3 font-mono">
                {activePromo.code}
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              Estado de pago
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge
                className={`border-0 ${paymentStatusColors[currentUser.payment.status]}`}
              >
                {paymentStatusLabels[currentUser.payment.status]}
              </Badge>
              <span className="text-sm text-foreground font-medium">
                Plan {currentUser.payment.plan}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Proximo pago: {formatDateLong(currentUser.payment.nextPayment)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suggested Sessions (if any from trainer) */}
      <PlannedSessionsClientView />

      {/* Recent machines */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Maquinas recientes
          </h3>
          <Link href="/dashboard/machines" className="text-xs text-primary font-medium hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {machines.slice(0, 3).map((machine) => {
            const lastSet = setHistory.find((s) => s.machineId === machine.id)
            return (
              <Link key={machine.id} href={`/dashboard/machines/${machine.id}`}>
                <Card className="group cursor-pointer border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Dumbbell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-foreground truncate">{machine.name}</h4>
                        {lastSet ? (
                          <p className="text-xs text-muted-foreground">
                            {lastSet.weight} kg x {lastSet.reps} reps
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sin historial</p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
