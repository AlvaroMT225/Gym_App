"use client"

import { useMemo } from "react"
import {
  Swords,
  Trophy,
  ScanLine,
  ClipboardList,
  ShieldCheck,
  Info,
  Crown,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import { useStore } from "@/lib/store"
import { formatNumber, formatDateShort } from "@/lib/utils"

export function ChallengesView() {
  const { challenges, optedInRankings, toggleRankingsOptIn, rankings, sessions } = useStore()

  // Count QR sessions vs manual sessions
  const qrSessions = useMemo(() => sessions.filter((s) => s.source === "qr").length, [sessions])
  const manualSessions = useMemo(() => sessions.filter((s) => s.source === "manual").length, [sessions])

  // Recent sessions for "Ranking" / "No ranking" display
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
          {challenges.filter((c) => c.active).map((challenge) => (
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
                    <span>{Math.round((challenge.progress / challenge.goal) * 100)}%</span>
                  </div>
                  <Progress value={(challenge.progress / challenge.goal) * 100} className="h-2.5" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Rankings */}
      {optedInRankings && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Ranking del gym
          </h3>
          <Card className="border border-border">
            <CardContent className="py-2">
              <div className="flex flex-col">
                {rankings.map((entry, i) => (
                  <div
                    key={`rank-${entry.rank}`}
                    className={`flex items-center gap-3 px-3 py-3 ${
                      i < rankings.length - 1 ? "border-b border-border" : ""
                    } ${entry.isUser ? "bg-primary/5 rounded-lg -mx-1 px-4" : ""}`}
                  >
                    <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 ${
                      entry.rank === 1
                        ? "bg-accent/20 text-accent"
                        : entry.rank === 2
                        ? "bg-muted text-muted-foreground"
                        : entry.rank === 3
                        ? "bg-accent/10 text-accent/70"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank}
                    </span>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {entry.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${entry.isUser ? "text-primary" : "text-foreground"}`}>
                        {entry.name}
                        {entry.isUser && <span className="text-xs text-primary/70 ml-1">(tu)</span>}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-foreground">{formatNumber(entry.points)} pts</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
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
