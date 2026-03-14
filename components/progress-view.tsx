"use client"

import { useEffect, useMemo, useState } from "react"
import {
  Trophy,
  Flame,
  Dumbbell,
  TrendingUp,
  Calendar,
  Filter,
  Star,
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
import { formatNumber } from "@/lib/utils"

type Range = "7" | "30" | "90"

interface StatsResponse {
  currentStreak: number
  totalPoints: number
  xp_total: number
  xp_total_formatted: string
  xp_by_region: {
    upper: number
    lower: number
  }
}

interface WorkoutSessionSummary {
  id: string
  routine_id: string | null
  started_at: string
  ended_at: string | null
  duration_minutes: number | null
  total_volume_kg: number
  total_sets: number
  total_reps: number
  status: string
  session_type: string
}

interface PersonalRecordSummary {
  id: string
  exerciseId: string
  exerciseName: string | null
  muscleGroups: string[] | null
  machineId: string | null
  recordType: string
  value: number
  previousValue: number | null
  achievedAt: string
}

interface WorkoutSessionsResponse {
  sessions?: WorkoutSessionSummary[]
}

interface PersonalRecordsResponse {
  records?: PersonalRecordSummary[]
}

interface XpHistoryPoint {
  week: string
  xp: number
}

function getRecordTypeLabel(recordType: string) {
  switch (recordType) {
    case "1rm":
      return "1RM"
    case "max_reps":
      return "Max reps"
    case "max_volume":
      return "Max volumen"
    case "best_time":
      return "Mejor tiempo"
    default:
      return recordType || "PR"
  }
}

function toNonNegativeNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0
  }

  return value >= 0 ? value : 0
}

function formatXpTotal(value: number): string {
  return `${new Intl.NumberFormat("en-US").format(toNonNegativeNumber(value))} XP`
}

function formatXpValue(value: number): string {
  return `${formatNumber(toNonNegativeNumber(value))} XP`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readNumberField(row: unknown, field: keyof StatsResponse): number {
  if (!isRecord(row)) {
    return 0
  }

  return toNonNegativeNumber(row[field])
}

function readStringField(row: unknown, field: keyof StatsResponse): string | null {
  if (!isRecord(row)) {
    return null
  }

  const value = row[field]
  return typeof value === "string" ? value : null
}

function readXpByRegion(row: unknown): StatsResponse["xp_by_region"] {
  if (!isRecord(row)) {
    return { upper: 0, lower: 0 }
  }

  const region = row["xp_by_region"]
  if (!isRecord(region)) {
    return { upper: 0, lower: 0 }
  }

  return {
    upper: toNonNegativeNumber(region["upper"]),
    lower: toNonNegativeNumber(region["lower"]),
  }
}

const EMPTY_STATS: StatsResponse = {
  currentStreak: 0,
  totalPoints: 0,
  xp_total: 0,
  xp_total_formatted: "0 XP",
  xp_by_region: {
    upper: 0,
    lower: 0,
  },
}

export function ProgressView() {
  const [range, setRange] = useState<Range>("30")
  const [machineFilter, setMachineFilter] = useState<string>("all")
  const [stats, setStats] = useState<StatsResponse>(EMPTY_STATS)
  const [sessions, setSessions] = useState<WorkoutSessionSummary[]>([])
  const [records, setRecords] = useState<PersonalRecordSummary[]>([])
  const [xpHistory, setXpHistory] = useState<XpHistoryPoint[]>([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingRecords, setLoadingRecords] = useState(true)
  const [loadingXpHistory, setLoadingXpHistory] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      setLoadingStats(true)
      try {
        const response = await fetch("/api/client/progress", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("stats_request_failed")
        }

        const json: unknown = await response.json()
        if (cancelled) return

        const xpTotal = readNumberField(json, "xp_total")
        const xpTotalFormattedValue = readStringField(json, "xp_total_formatted")
        const xpTotalFormatted =
          typeof xpTotalFormattedValue === "string" && xpTotalFormattedValue.trim().length > 0
            ? xpTotalFormattedValue
            : formatXpTotal(xpTotal)

        setStats({
          currentStreak: readNumberField(json, "currentStreak"),
          totalPoints: readNumberField(json, "totalPoints"),
          xp_total: xpTotal,
          xp_total_formatted: xpTotalFormatted,
          xp_by_region: readXpByRegion(json),
        })
      } catch {
        if (cancelled) return
        setStats(EMPTY_STATS)
        setError("No fue posible cargar tu progreso")
      } finally {
        if (!cancelled) setLoadingStats(false)
      }
    }

    void loadStats()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadSessions = async () => {
      setLoadingSessions(true)
      try {
        const response = await fetch(`/api/client/workout-sessions?days=${range}`, {
          cache: "no-store",
        })
        if (!response.ok) {
          throw new Error("sessions_request_failed")
        }

        const json = (await response.json()) as WorkoutSessionsResponse
        const rawSessions = Array.isArray(json.sessions) ? json.sessions : []
        const sessionList = rawSessions
          .map((session) => {
            const candidate = session as Partial<WorkoutSessionSummary>
            return {
              id: typeof candidate.id === "string" ? candidate.id : "",
              routine_id: typeof candidate.routine_id === "string" ? candidate.routine_id : null,
              started_at: typeof candidate.started_at === "string" ? candidate.started_at : "",
              ended_at: typeof candidate.ended_at === "string" ? candidate.ended_at : null,
              duration_minutes:
                typeof candidate.duration_minutes === "number" ? candidate.duration_minutes : null,
              total_volume_kg:
                typeof candidate.total_volume_kg === "number" ? candidate.total_volume_kg : 0,
              total_sets: typeof candidate.total_sets === "number" ? candidate.total_sets : 0,
              total_reps: typeof candidate.total_reps === "number" ? candidate.total_reps : 0,
              status: typeof candidate.status === "string" ? candidate.status : "",
              session_type: typeof candidate.session_type === "string" ? candidate.session_type : "",
            }
          })
          .filter((session) => session.id && session.started_at)

        if (cancelled) return
        setSessions(sessionList)
      } catch {
        if (cancelled) return
        setSessions([])
        setError("No fue posible cargar tu progreso")
      } finally {
        if (!cancelled) setLoadingSessions(false)
      }
    }

    void loadSessions()

    return () => {
      cancelled = true
    }
  }, [range])

  useEffect(() => {
    let cancelled = false

    const loadXpHistory = async () => {
      setLoadingXpHistory(true)
      try {
        const response = await fetch("/api/client/progress/xp-history", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("xp_history_request_failed")
        }

        const json: unknown = await response.json()
        if (cancelled) return

        const history = Array.isArray(json)
          ? json
              .filter((item): item is Record<string, unknown> => isRecord(item))
              .map((item) => {
                const week = typeof item.week === "string" ? item.week : ""
                return {
                  week,
                  xp: toNonNegativeNumber(item.xp),
                }
              })
              .filter((item) => item.week.length > 0)
          : []

        setXpHistory(history)
      } catch {
        if (cancelled) return
        setXpHistory([])
        setError("No fue posible cargar tu progreso")
      } finally {
        if (!cancelled) setLoadingXpHistory(false)
      }
    }

    void loadXpHistory()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadRecords = async () => {
      setLoadingRecords(true)
      try {
        const response = await fetch("/api/client/personal-records/recent", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("records_request_failed")
        }

        const json = (await response.json()) as PersonalRecordsResponse
        const rawRecords = Array.isArray(json.records) ? json.records : []
        const recordList = rawRecords
          .map((record) => {
            const candidate = record as Partial<PersonalRecordSummary>
            return {
              id: typeof candidate.id === "string" ? candidate.id : "",
              exerciseId: typeof candidate.exerciseId === "string" ? candidate.exerciseId : "",
              exerciseName: typeof candidate.exerciseName === "string" ? candidate.exerciseName : null,
              muscleGroups: Array.isArray(candidate.muscleGroups)
                ? candidate.muscleGroups.filter(
                    (muscle): muscle is string => typeof muscle === "string"
                  )
                : null,
              machineId: typeof candidate.machineId === "string" ? candidate.machineId : null,
              recordType: typeof candidate.recordType === "string" ? candidate.recordType : "",
              value: typeof candidate.value === "number" ? candidate.value : 0,
              previousValue:
                typeof candidate.previousValue === "number" ? candidate.previousValue : null,
              achievedAt: typeof candidate.achievedAt === "string" ? candidate.achievedAt : "",
            }
          })
          .filter((record) => record.id && record.exerciseId && record.achievedAt)

        if (cancelled) return
        setRecords(recordList)
      } catch {
        if (cancelled) return
        setRecords([])
        setError("No fue posible cargar tu progreso")
      } finally {
        if (!cancelled) setLoadingRecords(false)
      }
    }

    void loadRecords()

    return () => {
      cancelled = true
    }
  }, [])

  const isLoading = loadingStats || loadingSessions || loadingRecords || loadingXpHistory

  // Filter sessions by range and machine
  const filteredSessions = useMemo(() => {
    return sessions
  }, [sessions])

  const filteredRecords = useMemo(() => {
    if (machineFilter === "all") return records
    return records.filter((record) => record.machineId === machineFilter)
  }, [records, machineFilter])

  // KPIs
  const totalPRs = useMemo(() => {
    return filteredRecords.length
  }, [filteredRecords])

  const weeklyVolume = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sessions
      .filter((s) => new Date(s.started_at) >= weekAgo)
      .reduce((acc, s) => acc + s.total_volume_kg, 0)
  }, [sessions])

  const sessionsPerWeek = useMemo(() => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return sessions.filter((s) => new Date(s.started_at) >= weekAgo).length
  }, [sessions])

  // Weekly volume chart data
  const volumeChartData = useMemo(() => {
    const weeks: Record<string, number> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const weekStart = new Date(now.getTime() - (i * 7 + 6) * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const label = `S${6 - i}`
      weeks[label] = 0
      for (const s of sessions) {
        const d = new Date(s.started_at)
        if (d >= weekStart && d <= weekEnd) {
          weeks[label] += s.total_volume_kg
        }
      }
    }
    return Object.entries(weeks).map(([name, volumen]) => ({ name, volumen }))
  }, [sessions])

  // PR trend chart data
  const prTrendData = useMemo(() => {
    const sorted = [...filteredRecords].sort(
      (a, b) => new Date(a.achievedAt).getTime() - new Date(b.achievedAt).getTime()
    )
    const points: { date: string; pr: number }[] = []
    let currentMax = 0
    for (const record of sorted) {
      if (record.value > currentMax) {
        currentMax = record.value
        const d = new Date(record.achievedAt)
        points.push({ date: `${d.getDate()}/${d.getMonth() + 1}`, pr: currentMax })
      }
    }
    return points
  }, [filteredRecords])

  const xpHistoryChartData = useMemo(() => {
    return xpHistory.map((point) => ({
      week: point.week,
      xp: point.xp,
      weekLabel: point.week.slice(5),
    }))
  }, [xpHistory])

  // Consistency: days with sessions in range
  const consistencyDays = useMemo(() => {
    const days = new Set<string>()
    for (const s of filteredSessions) {
      if (s.started_at.includes("T")) {
        days.add(s.started_at.split("T")[0])
      }
    }
    return days.size
  }, [filteredSessions])

  // Top PRs by machine
  const topPRs = useMemo(() => {
    return [...filteredRecords]
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
      .map((record) => ({
        id: record.id,
        weight: record.value,
        recordTypeLabel: getRecordTypeLabel(record.recordType),
        machineName: record.exerciseName || "Ejercicio",
      }))
  }, [filteredRecords])

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
          disabled
          className="px-3 py-1.5 rounded-lg border border-input bg-background text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="all">Filtro por maquina: Disponible pronto</option>
        </select>
        {isLoading ? (
          <span className="text-xs text-muted-foreground">Cargando progreso...</span>
        ) : null}
        {!isLoading && sessions.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin sesiones recientes</span>
        ) : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
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
            <p className="text-2xl font-bold text-foreground">{stats.currentStreak}</p>
            <p className="text-xs text-muted-foreground">Dias de racha</p>
          </CardContent>
        </Card>
        <Card className="border border-border hover:shadow-md transition-all duration-200">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Star className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.xp_total_formatted}</p>
            <p className="text-xs text-muted-foreground">XP Total</p>
          </CardContent>
        </Card>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:max-w-xl">
        <Card className="border border-border">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Tren Superior</p>
            <p className="text-lg font-semibold text-foreground">
              {formatXpValue(stats.xp_by_region.upper)}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="py-3">
            <p className="text-xs text-muted-foreground">Tren Inferior</p>
            <p className="text-lg font-semibold text-foreground">
              {formatXpValue(stats.xp_by_region.lower)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Star className="w-4 h-4 text-primary" />
              XP semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              {loadingXpHistory ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Cargando XP semanal...</p>
                </div>
              ) : xpHistoryChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={xpHistoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="weekLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [`${formatNumber(value)} XP`, "XP"]}
                    />
                    <Bar dataKey="xp" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">Aún no hay XP por QR en estas semanas</p>
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
              <div key={`pr-${i}-${pr.id}`} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/15 text-accent text-xs font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{pr.machineName}</p>
                    <p className="text-xs text-muted-foreground">{pr.recordTypeLabel}</p>
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
