"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Swords,
  Trophy,
  ScanLine,
  ClipboardList,
  ShieldCheck,
  Info,
  Crown,
  TrendingUp,
  TrendingDown,
  Minus,
  Globe,
  Dumbbell,
  Footprints,
  Star,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useStore } from "@/lib/store"
import { formatNumber, formatDateShort } from "@/lib/utils"

// ── DTOs matching API responses ──────────────────────────────────

interface ChallengeDto {
  id: string
  title: string
  description: string | null
  progress: number
  goal: number
  unit: string
  endsAt: string
  active: boolean
}

interface RankingEntryDto {
  rank: number
  name: string
  points: number
  avatar: string
  isUser: boolean
}

interface NewRankingEntryDto {
  athlete_id: string
  name: string
  avatar?: string
  final_score?: number
  global_score?: number
  rank_position: number
  previous_rank: number | null
  trend: "up" | "down" | "stable"
  score_upper?: number
  score_lower?: number
  diversity_factor?: number
  isUser?: boolean
}

// ── Component ────────────────────────────────────────────────────

export function ChallengesView() {
  const { sessions } = useStore()

  // Challenges
  const [challenges, setChallenges] = useState<ChallengeDto[]>([])
  const [loadingChallenges, setLoadingChallenges] = useState(true)

  // Legacy rankings (original endpoint)
  const [legacyRankings, setLegacyRankings] = useState<RankingEntryDto[]>([])

  // New rankings (3 leaderboards)
  const [globalRankings, setGlobalRankings] = useState<NewRankingEntryDto[]>([])
  const [upperRankings, setUpperRankings] = useState<NewRankingEntryDto[]>([])
  const [lowerRankings, setLowerRankings] = useState<NewRankingEntryDto[]>([])
  const [loadingRankings, setLoadingRankings] = useState(true)
  const [rankingsError, setRankingsError] = useState(false)

  // Opt-in stored in localStorage
  const [optedInRankings, setOptedInRankings] = useState(false)

  useEffect(() => {
    setOptedInRankings(localStorage.getItem("minty_ranking_opt_in") === "true")
  }, [])

  function toggleRankingsOptIn() {
    setOptedInRankings((prev) => {
      const next = !prev
      localStorage.setItem("minty_ranking_opt_in", String(next))
      return next
    })
  }

  // Fetch challenges
  useEffect(() => {
    async function fetchChallenges() {
      try {
        const res = await fetch("/api/client/challenges")
        if (res.ok) {
          const data = await res.json()
          setChallenges(data.challenges ?? [])
        }
      } catch (err) {
        console.error("ChallengesView: error fetching challenges", err)
      } finally {
        setLoadingChallenges(false)
      }
    }
    fetchChallenges()
  }, [])

  // Fetch rankings (new endpoints + legacy fallback)
  useEffect(() => {
    async function fetchAllRankings() {
      try {
        const [globalRes, upperRes, lowerRes] = await Promise.all([
          fetch("/api/client/rankings/global"),
          fetch("/api/client/rankings/regional?region=upper"),
          fetch("/api/client/rankings/regional?region=lower"),
        ])

        if (globalRes.ok && upperRes.ok && lowerRes.ok) {
          const globalData = await globalRes.json()
          const upperData = await upperRes.json()
          const lowerData = await lowerRes.json()

          setGlobalRankings(globalData.rankings ?? globalData ?? [])
          setUpperRankings(upperData.rankings ?? upperData ?? [])
          setLowerRankings(lowerData.rankings ?? lowerData ?? [])
        } else {
          setRankingsError(true)
          const legacyRes = await fetch("/api/client/rankings")
          if (legacyRes.ok) {
            const legacyData = await legacyRes.json()
            setLegacyRankings(legacyData.rankings ?? [])
          }
        }
      } catch (err) {
        console.error("ChallengesView: error fetching rankings", err)
        setRankingsError(true)
        try {
          const legacyRes = await fetch("/api/client/rankings")
          if (legacyRes.ok) {
            const legacyData = await legacyRes.json()
            setLegacyRankings(legacyData.rankings ?? [])
          }
        } catch {
          // silently fail
        }
      } finally {
        setLoadingRankings(false)
      }
    }
    fetchAllRankings()
  }, [])

  // Session counts
  const qrSessions = useMemo(() => sessions.filter((s) => s.source === "qr").length, [sessions])
  const manualSessions = useMemo(() => sessions.filter((s) => s.source === "manual").length, [sessions])

  const recentSessions = useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8)
  }, [sessions])

  return (
    <div className="flex flex-col gap-6">
      {/* Opt-in toggle */}
      <Card className="border border-border">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">Participar en rankings</p>
              <p className="text-xs text-muted-foreground">Puedes salir del ranking cuando quieras</p>
            </div>
          </div>
          <Switch checked={optedInRankings} onCheckedChange={toggleRankingsOptIn} />
        </CardContent>
      </Card>

      {/* QR-only rule notice */}
      <Card className="border border-dashed border-primary/30 bg-primary/5 shadow-none">
        <CardContent className="flex items-start gap-3 py-3">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Solo sesiones por QR cuentan para retos y rankings.</span>{" "}
            Las sesiones registradas manualmente no avanzan el progreso de los retos.
            Tienes {qrSessions} sesiones QR y {manualSessions} manuales.
          </div>
        </CardContent>
      </Card>

      {/* Active Challenges */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Retos activos
        </h3>
        <div className="flex flex-col gap-3">
          {loadingChallenges ? (
            <Card className="border border-border">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Cargando retos…
              </CardContent>
            </Card>
          ) : challenges.filter((c) => c.active).length === 0 ? (
            <Card className="border border-dashed border-muted-foreground/20 bg-muted/30 shadow-none">
              <CardContent className="flex flex-col items-center py-8 text-center">
                <Swords className="w-8 h-8 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">No hay retos activos en este momento.</p>
              </CardContent>
            </Card>
          ) : (
            challenges.filter((c) => c.active).map((challenge) => (
              <Card key={challenge.id} className="border border-border hover:shadow-md transition-all duration-200">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 shrink-0">
                        <Swords className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">{challenge.title}</h4>
                        <p className="text-xs text-muted-foreground">{challenge.description}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      Termina {formatDateShort(challenge.endsAt)}
                    </Badge>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>{challenge.progress} / {challenge.goal} {challenge.unit}</span>
                      <span>{challenge.goal > 0 ? Math.round((challenge.progress / challenge.goal) * 100) : 0}%</span>
                    </div>
                    <Progress value={challenge.goal > 0 ? (challenge.progress / challenge.goal) * 100 : 0} className="h-2.5" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* Rankings Section — 3 Leaderboards with Tabs                */}
      {/* ════════════════════════════════════════════════════════════ */}

      {optedInRankings && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Rankings del gym
          </h3>

          {loadingRankings ? (
            <Card className="border border-border">
              <CardContent className="py-6 text-center text-sm text-muted-foreground">
                Cargando rankings…
              </CardContent>
            </Card>
          ) : rankingsError && legacyRankings.length > 0 ? (
            <Card className="border border-border">
              <CardContent className="py-2">
                <LegacyLeaderboard rankings={legacyRankings} />
              </CardContent>
            </Card>
          ) : (
            <Tabs defaultValue="global" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="global" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Global</span>
                </TabsTrigger>
                <TabsTrigger value="upper" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Dumbbell className="w-3.5 h-3.5" />
                  <span>Tren Superior</span>
                </TabsTrigger>
                <TabsTrigger value="lower" className="flex items-center gap-1.5 text-xs sm:text-sm">
                  <Footprints className="w-3.5 h-3.5" />
                  <span>Tren Inferior</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="global">
                <GlobalLeaderboard entries={globalRankings} />
              </TabsContent>

              <TabsContent value="upper">
                <RegionalLeaderboard
                  entries={upperRankings}
                  regionLabel="Tren Superior"
                  emptyMessage="Aún no hay datos en Tren Superior. ¡Entrena pecho, espalda u hombros vía QR!"
                />
              </TabsContent>

              <TabsContent value="lower">
                <RegionalLeaderboard
                  entries={lowerRankings}
                  regionLabel="Tren Inferior"
                  emptyMessage="Aún no hay datos en Tren Inferior. ¡Entrena piernas o glúteos vía QR!"
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      )}

      {!optedInRankings && (
        <Card className="border border-dashed border-muted-foreground/20 bg-muted/30 shadow-none">
          <CardContent className="flex flex-col items-center py-8 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No estas participando en rankings.</p>
            <p className="text-xs text-muted-foreground mt-1">Activa el toggle de arriba para ver tu posicion.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent sessions with "Ranking" / "No ranking" */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Sesiones recientes — Validez para retos
        </h3>
        <div className="flex flex-col gap-2">
          {recentSessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between px-4 py-3 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-3">
                {session.source === "qr" ? (
                  <ScanLine className="w-4 h-4 text-primary" />
                ) : (
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                )}
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {session.sets.length} set{session.sets.length > 1 ? "s" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateShort(session.date)}</p>
                </div>
              </div>
              <Badge className={`border-0 text-xs ${
                session.source === "qr"
                  ? "bg-primary/10 text-primary"
                  : "bg-destructive/10 text-destructive"
              }`}>
                {session.source === "qr" ? "Ranking" : "No ranking"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// Sub-components
// ════════════════════════════════════════════════════════════════

/** Global leaderboard — shows Name, Score TS, Score TI, Score Global, Position */
function GlobalLeaderboard({ entries }: { entries: NewRankingEntryDto[] }) {
  if (entries.length === 0) {
    return (
      <Card className="border border-dashed border-muted-foreground/20 bg-muted/30 shadow-none">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <Star className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">Aún no hay datos en el ranking global. ¡Escanea máquinas QR para ganar XP!</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border">
      <CardContent className="py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border mb-1">
          <div className="w-8 shrink-0" />
          <div className="w-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Atleta</p>
          </div>
          <div className="w-16 text-center shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">TS</p>
          </div>
          <div className="w-16 text-center shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">TI</p>
          </div>
          <div className="w-20 text-center shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Global</p>
          </div>
          <div className="w-10 shrink-0" />
        </div>

        {/* Data rows */}
        <div className="flex flex-col">
          {entries.map((entry, i) => {
            const isUser = entry.isUser ?? false
            return (
              <div
                key={`global-${entry.athlete_id}-${i}`}
                className={`flex items-center gap-2 px-3 py-3 ${
                  i < entries.length - 1 ? "border-b border-border/50" : ""
                } ${isUser ? "bg-primary/5 rounded-lg" : ""}`}
              >
                {/* Rank badge */}
                <RankBadge position={entry.rank_position} />

                {/* Avatar */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {entry.avatar ?? entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isUser ? "text-primary" : "text-foreground"}`}>
                    {entry.name}
                    {isUser && <span className="text-xs text-primary/70 ml-1">(tú)</span>}
                  </p>
                </div>

                {/* Score TS */}
                <div className="w-16 text-center shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatNumber(Math.round(entry.score_upper ?? 0))}
                  </p>
                </div>

                {/* Score TI */}
                <div className="w-16 text-center shrink-0">
                  <p className="text-sm font-semibold text-foreground">
                    {formatNumber(Math.round(entry.score_lower ?? 0))}
                  </p>
                </div>

                {/* Score Global */}
                <div className="w-20 text-center shrink-0">
                  <p className="text-sm font-bold text-primary">
                    {formatNumber(Math.round(entry.global_score ?? 0))}
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">XP</span>
                  </p>
                </div>

                {/* Trend */}
                <TrendIndicator trend={entry.trend} previousRank={entry.previous_rank} currentRank={entry.rank_position} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** Regional leaderboard — shows Name, Score, Position */
function RegionalLeaderboard({
  entries,
  regionLabel,
  emptyMessage,
}: {
  entries: NewRankingEntryDto[]
  regionLabel: string
  emptyMessage: string
}) {
  if (entries.length === 0) {
    return (
      <Card className="border border-dashed border-muted-foreground/20 bg-muted/30 shadow-none">
        <CardContent className="flex flex-col items-center py-8 text-center">
          <Star className="w-8 h-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border border-border">
      <CardContent className="py-3">
        {/* Header row */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border mb-1">
          <div className="w-8 shrink-0" />
          <div className="w-8 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Atleta</p>
          </div>
          <div className="w-24 text-center shrink-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{regionLabel}</p>
          </div>
          <div className="w-10 shrink-0" />
        </div>

        {/* Data rows */}
        <div className="flex flex-col">
          {entries.map((entry, i) => {
            const score = entry.final_score ?? 0
            const isUser = entry.isUser ?? false

            return (
              <div
                key={`regional-${entry.athlete_id}-${i}`}
                className={`flex items-center gap-2 px-3 py-3 ${
                  i < entries.length - 1 ? "border-b border-border/50" : ""
                } ${isUser ? "bg-primary/5 rounded-lg" : ""}`}
              >
                {/* Rank badge */}
                <RankBadge position={entry.rank_position} />

                {/* Avatar */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {entry.avatar ?? entry.name?.charAt(0)?.toUpperCase() ?? "?"}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isUser ? "text-primary" : "text-foreground"}`}>
                    {entry.name}
                    {isUser && <span className="text-xs text-primary/70 ml-1">(tú)</span>}
                  </p>
                </div>

                {/* Score */}
                <div className="w-24 text-center shrink-0">
                  <p className="text-sm font-bold text-primary">
                    {formatNumber(Math.round(score))}
                    <span className="text-xs font-normal text-muted-foreground ml-0.5">XP</span>
                  </p>
                </div>

                {/* Trend */}
                <TrendIndicator trend={entry.trend} previousRank={entry.previous_rank} currentRank={entry.rank_position} />
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/** Rank position badge with medal colors for top 3 */
function RankBadge({ position }: { position: number }) {
  if (position === 1) {
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 shrink-0">
        <Crown className="w-4 h-4" />
      </span>
    )
  }
  if (position === 2) {
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 text-xs font-bold shrink-0">
        2°
      </span>
    )
  }
  if (position === 3) {
    return (
      <span className="flex items-center justify-center w-8 h-8 rounded-full bg-amber-50 text-amber-600 text-xs font-bold shrink-0">
        3°
      </span>
    )
  }
  return (
    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground text-xs font-bold shrink-0">
      {position}°
    </span>
  )
}

/** Trend arrow: green up, red down, gray stable */
function TrendIndicator({
  trend,
  previousRank,
  currentRank,
}: {
  trend: string
  previousRank: number | null
  currentRank: number
}) {
  const diff = previousRank != null ? previousRank - currentRank : 0

  if (trend === "up") {
    return (
      <div className="flex items-center gap-0.5 w-10 justify-center shrink-0" title={`Subió ${diff} puesto${diff > 1 ? "s" : ""}`}>
        <TrendingUp className="w-3.5 h-3.5 text-green-500" />
        {diff > 0 && <span className="text-xs font-medium text-green-500">+{diff}</span>}
      </div>
    )
  }

  if (trend === "down") {
    return (
      <div className="flex items-center gap-0.5 w-10 justify-center shrink-0" title={`Bajó ${Math.abs(diff)} puesto${Math.abs(diff) > 1 ? "s" : ""}`}>
        <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        {diff < 0 && <span className="text-xs font-medium text-red-500">{diff}</span>}
      </div>
    )
  }

  return (
    <div className="flex items-center w-10 justify-center shrink-0" title="Sin cambios">
      <Minus className="w-3.5 h-3.5 text-muted-foreground/50" />
    </div>
  )
}

/** Legacy leaderboard (fallback if new endpoints fail) */
function LegacyLeaderboard({ rankings }: { rankings: RankingEntryDto[] }) {
  if (rankings.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Todavía no hay datos de ranking.</p>
  }

  return (
    <div className="flex flex-col">
      {rankings.map((entry, i) => (
        <div
          key={`rank-${entry.rank}`}
          className={`flex items-center gap-3 px-3 py-3 ${
            i < rankings.length - 1 ? "border-b border-border" : ""
          } ${entry.isUser ? "bg-primary/5 rounded-lg -mx-1 px-4" : ""}`}
        >
          <RankBadge position={entry.rank} />
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
            {entry.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${entry.isUser ? "text-primary" : "text-foreground"}`}>
              {entry.name}
              {entry.isUser && <span className="text-xs text-primary/70 ml-1">(tú)</span>}
            </p>
          </div>
          <span className="text-sm font-bold text-foreground">{formatNumber(entry.points)} pts</span>
        </div>
      ))}
    </div>
  )
}