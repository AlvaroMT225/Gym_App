"use client"

import { useState, useMemo } from "react"
import {
  Trophy,
  Flame,
  Dumbbell,
  TrendingUp,
  Calendar,
  Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { machines } from "@/lib/mock-data"
import { useStore } from "@/lib/store"
import { formatNumber } from "@/lib/utils"

type Range = "7" | "30" | "90"

export function ProgressView() {
  const { sessions, user } = useStore()
  const [range, setRange] = useState<Range>("30")
  const [machineFilter, setMachineFilter] = useState<string>("all")

  // Filter sessions by range and machine
  const filteredSessions = useMemo(() => {
    const now = new Date("2026-02-10")
    const daysBack = Number(range)
    const cutoff = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    return sessions.filter((s) => {
      const d = new Date(s.date)
      if (d < cutoff) return false
      if (machineFilter !== "all" && s.machineId !== machineFilter) return false
      return true
    })
  }, [sessions, range, machineFilter])

  // KPIs
  const totalPRs = useMemo(() => {
    const prMap: Record<string, number> = {}
    for (const s of sessions) {
      for (const set of s.sets) {
        if (!prMap[s.machineId] || set.weight > prMap[s.machineId]) {
          prMap[s.machineId] = set.weight
        }
      }
    }
    return Object.keys(prMap).length
  }, [sessions])

  const weeklyVolume = useMemo(() => {
    const now = new Date("2026-02-10")
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sessions
      .filter((s) => new Date(s.date) >= weekAgo)
      .reduce((acc, s) => acc + s.sets.reduce((a, set) => a + set.weight * set.reps, 0), 0)
  }, [sessions])

  const sessionsPerWeek = useMemo(() => {
    const now = new Date("2026-02-10")
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sessions.filter((s) => new Date(s.date) >= weekAgo).length
  }, [sessions])

  // Weekly volume chart data
  const volumeChartData = useMemo(() => {
    const weeks: Record<string, number> = {}
    const now = new Date("2026-02-10")
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const label = `S${6 - i}`
      weeks[label] = 0
      for (const s of sessions) {
        const d = new Date(s.date)
        if (d >= weekStart && d <= weekEnd) {
          if (machineFilter === "all" || s.machineId === machineFilter) {
            weeks[label] += s.sets.reduce((a, set) => a + set.weight * set.reps, 0)
          }
        }
      }
    }
    return Object.entries(weeks).map(([name, volumen]) => ({ name, volumen }))
  }, [sessions, machineFilter])

  // PR trend chart data
  const prTrendData = useMemo(() => {
    const machineIds = machineFilter === "all" ? [...new Set(sessions.map((s) => s.machineId))] : [machineFilter]
    const sorted = [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const points: { date: string; pr: number }[] = []
    let currentMax = 0
    for (const s of sorted) {
      if (!machineIds.includes(s.machineId)) continue
      for (const set of s.sets) {
        if (set.weight > currentMax) {
          currentMax = set.weight
          const d = new Date(s.date)
          points.push({ date: `${d.getDate()}/${d.getMonth() + 1}`, pr: currentMax })
        }
      }
    }
    return points
  }, [sessions, machineFilter])

  // Consistency: days with sessions in range
  const consistencyDays = useMemo(() => {
    const days = new Set<string>()
    for (const s of filteredSessions) {
      days.add(s.date.split("T")[0])
    }
    return days.size
  }, [filteredSessions])

  // Top PRs by machine
  const topPRs = useMemo(() => {
    const prMap: Record<string, { weight: number; reps: number; date: string; machineName: string }> = {}
    for (const s of filteredSessions) {
      for (const set of s.sets) {
        const key = s.machineId
        if (!prMap[key] || set.weight > prMap[key].weight) {
          const m = machines.find((mac) => mac.id === s.machineId)
          prMap[key] = {
            weight: set.weight,
            reps: set.reps,
            date: s.date,
            machineName: m?.name || s.machineId,
          }
        }
      }
    }
    return Object.values(prMap).sort((a, b) => b.weight - a.weight)
  }, [filteredSessions])

  return (
    <div className="flex flex-col gap-6">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground font-medium">Filtros:</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["7", "30", "90"] as Range[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                range === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {r}d
            </button>
          ))}
        </div>
        <select
          value={machineFilter}
          onChange={(e) => setMachineFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Todas las maquinas</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{totalPRs}</p>
            <p className="text-xs text-muted-foreground">PRs totales</p>
          </CardContent>
        </Card>
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(weeklyVolume)} <span className="text-sm font-normal">kg</span></p>
            <p className="text-xs text-muted-foreground">Volumen semanal</p>
          </CardContent>
        </Card>
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{sessionsPerWeek}</p>
            <p className="text-xs text-muted-foreground">Sesiones/semana</p>
          </CardContent>
        </Card>
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{user.scanStreak}</p>
            <p className="text-xs text-muted-foreground">Dias de racha</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Volume Bar Chart */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Volumen semanal (kg)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volumeChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Bar dataKey="volumen" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* PR Trend Line Chart */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Trophy className="w-4 h-4 text-accent" />
              Tendencia de PR (kg)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              {prTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={prTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                    />
                    <Line type="monotone" dataKey="pr" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Sin datos de PR para el filtro actual</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Consistency */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            Consistencia ({range} dias)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                <span>{consistencyDays} dias activos</span>
                <span>{Math.round((consistencyDays / Number(range)) * 100)}%</span>
              </div>
              <Progress value={(consistencyDays / Number(range)) * 100} className="h-3" />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">{consistencyDays}</p>
              <p className="text-xs text-muted-foreground">de {range} dias</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top PRs */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" />
            Top PRs recientes
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {topPRs.length > 0 ? (
            topPRs.map((pr, i) => (
              <div key={`pr-${i}-${pr.machineName}`} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pr.machineName}</p>
                    <p className="text-xs text-muted-foreground">{pr.reps} reps</p>
                  </div>
                </div>
                <Badge className="bg-accent/10 text-accent border-0 text-sm font-bold">{pr.weight} kg</Badge>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No hay PRs en el rango seleccionado</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
