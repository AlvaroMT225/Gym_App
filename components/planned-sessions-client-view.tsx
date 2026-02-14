"use client"

import { useEffect, useState } from "react"
import { ClipboardList, CalendarIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateLong } from "@/lib/utils"
import { useAuth } from "@/lib/auth/auth-context"

interface PlannedSessionItem {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  restSec: number
  targetRpe?: number
  notes?: string
}

interface PlannedSession {
  id: string
  title: string
  description?: string
  scheduledAt: string | null
  items: PlannedSessionItem[]
  version: number
  updatedAt: string
}

export function PlannedSessionsClientView() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<PlannedSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.role !== "USER") {
      setLoading(false)
      return
    }

    fetch("/api/client/planned-sessions")
      .then((r) => r.ok ? r.json() : { sessions: [] })
      .then((data) => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [user])

  if (loading || sessions.length === 0) return null

  return (
    <Card className="border border-border hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-accent" />
          Sesiones sugeridas por tu entrenador
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {sessions.map((session) => (
          <div key={session.id} className="border border-border rounded-lg p-3 bg-accent/5">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-semibold text-foreground">{session.title}</h4>
              <Badge variant="secondary" className="text-[10px]">v{session.version}</Badge>
            </div>
            {session.description && (
              <p className="text-xs text-muted-foreground mb-2">{session.description}</p>
            )}
            {session.scheduledAt && (
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
                <CalendarIcon className="w-3 h-3" />
                <span>Sugerida para: {formatDateLong(session.scheduledAt)}</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              {session.items.map((item, idx) => (
                <div key={idx} className="text-xs text-foreground">
                  • {item.exerciseName}: {item.sets}x{item.reps} @ {item.restSec}s
                  {item.targetRpe && ` (RPE ${item.targetRpe})`}
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
