"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Dumbbell,
  TrendingUp,
  Trophy,
  Award,
  ClipboardList,
  MessageSquare,
  Lock,
  Send,
  ChevronDown,
  ChevronUp,
  Target,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { formatDateLong, formatNumber } from "@/lib/utils"

/* ---------- types ---------- */

interface ClientSummary {
  client: {
    id: string
    name: string
    alias: string
    avatar: string
    memberSince: string
    goal: string
  }
  consent: {
    status: string
    scopes: string[]
    expires_at: string | null
  }
}

interface SessionExercise {
  id: string
  name: string
  muscles: string[]
  machine: string
}

interface SessionSet {
  weight: number
  reps: number
  rpe: number
  notes?: string
}

interface SessionComment {
  id: string
  comment: string
  createdAt: string
}

interface SessionEntry {
  id: string
  date: string
  source: string
  exercise: SessionExercise
  sets: SessionSet[]
  comments: SessionComment[]
}

interface SessionsData {
  sessions: SessionEntry[]
  metrics: { totalVolume: number; totalReps: number; avgRpe: number }
}

interface RoutineExercise {
  id: string
  name: string
  sets: number
  reps: number
  restSec: number
  notes?: string
}

interface RoutinePlan {
  id: string
  title: string
  updatedAt: string
  weeks: number
  progression: string
  exercises: RoutineExercise[]
}

interface RoutineData {
  active: RoutinePlan | null
  proposal: RoutinePlan | null
}

interface ProgressData {
  kpis: {
    weeklyVolume: number
    monthlyVolume: number
    sessionsPerWeek: number
    streak: number
  }
  comparison: { prevWeeklyVolume: number; changePct: number }
  trend: { direction: string; note: string }
  plateau: { isPlateau: boolean; reason: string }
}

interface PREntry {
  exerciseId: string
  exerciseName: string
  bestWeight: number
  date: string
}

interface AchievementEntry {
  id: string
  title: string
  description: string
  unlocked: boolean
  date?: string
}

const scopeLabels: Record<string, string> = {
  "sessions:read": "Sesiones",
  "sessions:comment": "Comentarios",
  "routines:read": "Rutinas",
  "routines:write": "Editar rutinas",
  "exercises:read": "Ejercicios",
  "progress:read": "Progreso",
  "prs:read": "PRs",
  "achievements:read": "Logros",
  "goals:write": "Objetivos",
}

/* ---------- blocked card ---------- */

function BlockedCard({ label }: { label: string }) {
  return (
    <Card className="border border-dashed border-border bg-muted/40">
      <CardContent className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted mb-3">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium text-muted-foreground">Sin acceso</p>
        <p className="text-xs text-muted-foreground mt-1">
          El cliente no compartio {label}.
        </p>
      </CardContent>
    </Card>
  )
}

/* ---------- sessions module ---------- */

function SessionsModule({
  clientId,
  canComment,
}: {
  clientId: string
  canComment: boolean
}) {
  const [data, setData] = useState<SessionsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetch(`/api/trainer/clients/${clientId}/sessions`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  const handleComment = useCallback(
    async (sessionId: string) => {
      if (!commentText.trim() || sending) return
      setSending(true)
      try {
        const res = await fetch(
          `/api/trainer/clients/${clientId}/sessions/${sessionId}/comment`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ comment: commentText.trim() }),
          }
        )
        if (res.ok) {
          const result = await res.json()
          setData((prev) => {
            if (!prev) return prev
            return {
              ...prev,
              sessions: prev.sessions.map((s) =>
                s.id === sessionId
                  ? { ...s, comments: [result.comment, ...s.comments] }
                  : s
              ),
            }
          })
          setCommentText("")
        }
      } catch {
        // ignore
      } finally {
        setSending(false)
      }
    },
    [clientId, commentText, sending]
  )

  if (loading) return <p className="text-sm text-muted-foreground">Cargando sesiones...</p>
  if (!data) return null

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Sesiones de entrenamiento
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Metrics summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{formatNumber(data.metrics.totalVolume)}</p>
            <p className="text-[10px] text-muted-foreground">Vol. total (kg)</p>
          </div>
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{formatNumber(data.metrics.totalReps)}</p>
            <p className="text-[10px] text-muted-foreground">Reps totales</p>
          </div>
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{data.metrics.avgRpe.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground">RPE promedio</p>
          </div>
        </div>

        {data.sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin sesiones registradas.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.sessions.map((session) => {
              const isOpen = expanded === session.id
              return (
                <div key={session.id} className="border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : session.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 shrink-0">
                        <Dumbbell className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {session.exercise.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateLong(session.date)} &middot; {session.sets.length} sets &middot;{" "}
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {session.source === "qr" ? "QR" : "Manual"}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 border-t border-border">
                      {/* Exercise details */}
                      <div className="flex flex-wrap gap-1.5 py-3">
                        {session.exercise.muscles.map((m) => (
                          <Badge key={m} variant="secondary" className="text-[10px]">
                            {m}
                          </Badge>
                        ))}
                        {session.exercise.machine && (
                          <Badge variant="outline" className="text-[10px]">
                            {session.exercise.machine}
                          </Badge>
                        )}
                      </div>

                      {/* Sets table */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-muted-foreground">
                              <th className="text-left py-1.5 pr-2 font-medium">Set</th>
                              <th className="text-right py-1.5 px-2 font-medium">Peso</th>
                              <th className="text-right py-1.5 px-2 font-medium">Reps</th>
                              <th className="text-right py-1.5 px-2 font-medium">RPE</th>
                              <th className="text-left py-1.5 pl-2 font-medium">Nota</th>
                            </tr>
                          </thead>
                          <tbody>
                            {session.sets.map((set, i) => (
                              <tr key={i} className="border-t border-border/50">
                                <td className="py-2 pr-2 font-medium text-foreground">{i + 1}</td>
                                <td className="py-2 px-2 text-right text-foreground">{set.weight} kg</td>
                                <td className="py-2 px-2 text-right text-foreground">{set.reps}</td>
                                <td className="py-2 px-2 text-right text-foreground">{set.rpe}</td>
                                <td className="py-2 pl-2 text-muted-foreground text-xs">{set.notes || "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Comments */}
                      {session.comments.length > 0 && (
                        <div className="mt-3 flex flex-col gap-2">
                          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Comentarios
                          </p>
                          {session.comments.map((c) => (
                            <div key={c.id} className="bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
                              <p className="text-sm text-foreground">{c.comment}</p>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                {formatDateLong(c.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment */}
                      {canComment && (
                        <div className="mt-3 flex gap-2">
                          <Textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Escribe un comentario..."
                            className="min-h-[60px] text-sm"
                          />
                          <Button
                            size="sm"
                            className="shrink-0 self-end gap-1"
                            onClick={() => handleComment(session.id)}
                            disabled={!commentText.trim() || sending}
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- routine module ---------- */

function RoutineModule({ clientId }: { clientId: string }) {
  const [data, setData] = useState<RoutineData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/trainer/clients/${clientId}/routine`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <p className="text-sm text-muted-foreground">Cargando rutina...</p>
  if (!data) return null

  function renderPlan(plan: RoutinePlan, isProposal: boolean) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground flex items-center gap-2">
              {plan.title}
              {isProposal && (
                <Badge className="bg-accent/15 text-accent border-0 text-[10px]">Propuesta</Badge>
              )}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {plan.weeks} semanas &middot; Actualizada {formatDateLong(plan.updatedAt)}
            </p>
          </div>
        </div>
        {plan.progression && (
          <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-muted/10">
            <span className="font-medium text-foreground">Progresion:</span> {plan.progression}
          </div>
        )}
        <div className="divide-y divide-border/50">
          {plan.exercises.map((ex) => (
            <div key={ex.id} className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <Dumbbell className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-sm text-foreground truncate">{ex.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 text-xs text-muted-foreground">
                <span>{ex.sets}x{ex.reps}</span>
                <span className="text-muted-foreground/50">|</span>
                <span>{ex.restSec}s</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Rutina
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {data.active ? (
          renderPlan(data.active, false)
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">Sin rutina activa.</p>
        )}
        {data.proposal && renderPlan(data.proposal, true)}
      </CardContent>
    </Card>
  )
}

/* ---------- progress module ---------- */

function ProgressModule({ clientId }: { clientId: string }) {
  const [data, setData] = useState<ProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/trainer/clients/${clientId}/progress`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <p className="text-sm text-muted-foreground">Cargando progreso...</p>
  if (!data) return null

  const changeColor = data.comparison.changePct >= 0 ? "text-primary" : "text-destructive"
  const changeSign = data.comparison.changePct >= 0 ? "+" : ""

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          Progreso
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{formatNumber(data.kpis.weeklyVolume)}</p>
            <p className="text-[10px] text-muted-foreground">Vol. semanal</p>
          </div>
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{formatNumber(data.kpis.monthlyVolume)}</p>
            <p className="text-[10px] text-muted-foreground">Vol. mensual</p>
          </div>
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{data.kpis.sessionsPerWeek}</p>
            <p className="text-[10px] text-muted-foreground">Sesiones/sem</p>
          </div>
          <div className="flex flex-col items-center py-3 bg-muted rounded-lg">
            <p className="text-lg font-bold text-foreground">{data.kpis.streak}</p>
            <p className="text-[10px] text-muted-foreground">Racha (dias)</p>
          </div>
        </div>

        <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 rounded-lg border border-border">
          <TrendingUp className={`w-5 h-5 ${changeColor} shrink-0`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">
              {changeSign}{data.comparison.changePct.toFixed(1)}% vs semana anterior
            </p>
            <p className="text-xs text-muted-foreground">{data.trend.note}</p>
          </div>
        </div>

        {data.plateau.isPlateau && (
          <div className="flex items-center gap-3 px-4 py-3 bg-accent/10 rounded-lg border border-accent/20">
            <Target className="w-5 h-5 text-accent shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Posible estancamiento</p>
              <p className="text-xs text-muted-foreground">{data.plateau.reason}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- PRs module ---------- */

function PRsModule({ clientId }: { clientId: string }) {
  const [prs, setPrs] = useState<PREntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/trainer/clients/${clientId}/prs`)
      .then((r) => r.json())
      .then((d) => setPrs(d.prs || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <p className="text-sm text-muted-foreground">Cargando PRs...</p>

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          Records Personales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {prs.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin PRs registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {prs.map((pr) => (
              <div key={pr.exerciseId} className="flex items-center justify-between px-3 py-2.5 bg-muted rounded-lg">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trophy className="w-4 h-4 text-accent shrink-0" />
                  <span className="text-sm font-medium text-foreground truncate">{pr.exerciseName}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-foreground">{pr.bestWeight} kg</span>
                  <span className="text-[10px] text-muted-foreground">{formatDateLong(pr.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- achievements module ---------- */

function AchievementsModule({ clientId }: { clientId: string }) {
  const [achievements, setAchievements] = useState<AchievementEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/trainer/clients/${clientId}/achievements`)
      .then((r) => r.json())
      .then((d) => setAchievements(d.achievements || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clientId])

  if (loading) return <p className="text-sm text-muted-foreground">Cargando logros...</p>

  return (
    <Card className="border border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Award className="w-4 h-4 text-primary" />
          Logros
        </CardTitle>
      </CardHeader>
      <CardContent>
        {achievements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin logros registrados.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {achievements.map((ach) => (
              <div key={ach.id} className="flex items-center gap-3 px-3 py-2.5 bg-muted rounded-lg">
                <div
                  className={`flex items-center justify-center w-9 h-9 rounded-full shrink-0 ${
                    ach.unlocked ? "bg-primary/10" : "bg-muted-foreground/10"
                  }`}
                >
                  <Award
                    className={`w-4.5 h-4.5 ${ach.unlocked ? "text-primary" : "text-muted-foreground"}`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{ach.title}</p>
                  <p className="text-xs text-muted-foreground">{ach.description}</p>
                </div>
                {ach.unlocked ? (
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px] shrink-0">
                    {ach.date ? formatDateLong(ach.date) : "Desbloqueado"}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    Pendiente
                  </Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/* ---------- main component ---------- */

export function TrainerClientDetail({ clientId }: { clientId: string }) {
  const [summary, setSummary] = useState<ClientSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [consentRevoked, setConsentRevoked] = useState(false)

  const revalidateConsent = useCallback(async () => {
    try {
      const res = await fetch(`/api/trainer/clients/${clientId}/summary`)
      if (!res.ok || res.status === 403) {
        setConsentRevoked(true)
        return
      }
      const data = await res.json()
      if (data.consent?.status !== "ACTIVE") {
        setConsentRevoked(true)
        return
      }
      // Update summary if still valid
      setSummary(data)
    } catch {
      setConsentRevoked(true)
    }
  }, [clientId])

  useEffect(() => {
    fetch(`/api/trainer/clients/${clientId}/summary`)
      .then((r) => {
        if (!r.ok) throw new Error("No se pudo cargar el cliente")
        return r.json()
      })
      .then((d) => setSummary(d))
      .catch((err) => setError(err instanceof Error ? err.message : "Error"))
      .finally(() => setLoading(false))
  }, [clientId])

  // Revalidate consent every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      revalidateConsent()
    }, 30000)
    return () => clearInterval(interval)
  }, [revalidateConsent])

  // Revalidate consent when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      revalidateConsent()
    }
    window.addEventListener("focus", handleFocus)
    return () => window.removeEventListener("focus", handleFocus)
  }, [revalidateConsent])

  if (loading) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <p className="text-sm text-muted-foreground">Cargando ficha del cliente...</p>
      </div>
    )
  }

  if (error || !summary) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <Card className="border border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">
            {error || "Cliente no encontrado"}
          </CardContent>
        </Card>
      </div>
    )
  }

  const { client, consent } = summary
  const scopes = new Set(consent.scopes)
  const hasScope = (s: string) => scopes.has(s)

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5 text-muted-foreground">
        <Link href="/trainer/clients">
          <ArrowLeft className="w-4 h-4" />
          Mis Clientes
        </Link>
      </Button>

      {/* Client header */}
      <Card className="border border-border mb-6">
        <CardContent className="py-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 text-primary text-xl font-bold">
              {client.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-foreground">{client.name}</h2>
              <p className="text-sm text-muted-foreground">{client.alias}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Miembro desde {formatDateLong(client.memberSince)} &middot; {client.goal}
              </p>
            </div>
          </div>
          {/* Scopes summary */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {consent.scopes.map((scope) => (
              <Badge key={scope} variant="secondary" className="text-[10px]">
                {scopeLabels[scope] ?? scope}
              </Badge>
            ))}
          </div>
          {consent.expires_at && (
            <p className="text-xs text-muted-foreground mt-2">
              Consentimiento expira: {formatDateLong(consent.expires_at)}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Consent revoked banner */}
      {consentRevoked && (
        <Alert className="mb-6 border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-destructive ml-2">
            <strong>Acceso revocado</strong> — El cliente ha revocado o modificado su consentimiento.
          </AlertDescription>
        </Alert>
      )}

      {/* Modular scope-based cards - only show if consent is still valid */}
      {!consentRevoked && (
      <div className="flex flex-col gap-6">
        {/* Sessions */}
        {hasScope("sessions:read") ? (
          <SessionsModule clientId={clientId} canComment={hasScope("sessions:comment")} />
        ) : (
          <BlockedCard label="sus sesiones" />
        )}

        {/* Routine */}
        {hasScope("routines:read") ? (
          <RoutineModule clientId={clientId} />
        ) : (
          <BlockedCard label="su rutina" />
        )}

        {/* Progress */}
        {hasScope("progress:read") ? (
          <ProgressModule clientId={clientId} />
        ) : (
          <BlockedCard label="su progreso" />
        )}

        {/* PRs */}
        {hasScope("prs:read") ? (
          <PRsModule clientId={clientId} />
        ) : (
          <BlockedCard label="sus records personales" />
        )}

        {/* Achievements */}
        {hasScope("achievements:read") ? (
          <AchievementsModule clientId={clientId} />
        ) : (
          <BlockedCard label="sus logros" />
        )}
      </div>
      )}
    </div>
  )
}
