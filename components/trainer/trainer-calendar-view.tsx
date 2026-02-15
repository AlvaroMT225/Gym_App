"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, Dumbbell } from "lucide-react"

interface CalendarSession {
  id: string
  title: string
  clientName: string
  clientAvatar: string
  clientId: string
  scheduledAt: string
  exerciseCount: number
  exercises: string[]
}

interface CalendarDay {
  date: string
  dayLabel: string
  sessions: CalendarSession[]
}

export function TrainerCalendarView() {
  const [days, setDays] = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/trainer/calendar")
      .then((r) => (r.ok ? r.json() : { days: [] }))
      .then((d) => setDays(d.days || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Calendario</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const today = new Date().toISOString().split("T")[0]

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarDays className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Calendario - Próximos 7 días</h1>
      </div>

      <div className="flex flex-col gap-3">
        {days.map((day) => {
          const isToday = day.date === today
          return (
            <Card key={day.date} className={`border ${isToday ? "border-primary/50 bg-primary/5" : "border-border"}`}>
              <CardHeader className="pb-1 pt-3 px-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <span className={isToday ? "text-primary" : "text-foreground"}>
                    {day.dayLabel}
                  </span>
                  <span className="text-xs text-muted-foreground font-normal">
                    {new Date(day.date + "T12:00:00").toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                  {isToday && (
                    <Badge variant="default" className="text-[10px] h-4">Hoy</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {day.sessions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">Sin sesiones</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {day.sessions.map((session) => (
                      <Link key={session.id} href={`/trainer/clients/${session.clientId}`}>
                        <div className="flex items-start gap-2 p-2 rounded-lg bg-background border border-border hover:shadow-sm transition-all cursor-pointer">
                          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-[10px] font-bold shrink-0">
                            {session.clientAvatar}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-foreground">{session.title}</p>
                            <p className="text-[10px] text-muted-foreground">{session.clientName}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {session.exercises.slice(0, 2).map((ex, i) => (
                                <span key={i} className="text-[10px] px-1 py-0.5 bg-muted rounded text-muted-foreground">
                                  {ex}
                                </span>
                              ))}
                              {session.exercises.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{session.exercises.length - 2}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(session.scheduledAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
