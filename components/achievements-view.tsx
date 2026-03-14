"use client"

import { useEffect, useState } from "react"

import {
  Zap,
  Flame,
  Trophy,
  Target,
  Shield,
  TrendingUp,
  Swords,
  Medal,
  Sun,
  QrCode,
  Lock,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatNumber, formatDateLong } from "@/lib/utils"

type AchievementDto = {
  id: string
  name: string
  description: string | null
  category: string | null
  iconName: string | null
  iconColor: string
  points: number
  criteria: Record<string, unknown>
  unlocked: boolean
  unlockedAt: string | null
}

type AchievementsResponse = {
  achievements: AchievementDto[]
  unlockedCount: number
  totalCount: number
  recentUnlocked: AchievementDto[]
}

const iconMap: Record<string, typeof Zap> = {
  Zap, Flame, Trophy, Target, Shield, TrendingUp, Swords, Medal, Sun, QrCode,
}

const categoryLabels: Record<string, string> = {
  milestone: "Hitos",
  consistency: "Constancia",
  strength: "Fuerza",
  volume: "Volumen",
  racha: "Racha",
  volumen: "Volumen",
  pr: "PR",
  constancia: "Constancia",
  retos: "Retos",
}

const categoryColors: Record<string, string> = {
  racha: "bg-accent/15 text-accent",
  volumen: "bg-primary/10 text-primary",
  pr: "bg-accent/15 text-accent",
  constancia: "bg-primary/10 text-primary",
  retos: "bg-destructive/10 text-destructive",
}

export function AchievementsView() {
  const [stats, setStats] = useState<{ currentStreak: number; totalPoints: number }>({
    currentStreak: 0,
    totalPoints: 0,
  })
  const [response, setResponse] = useState<AchievementsResponse>({
    achievements: [],
    unlockedCount: 0,
    totalCount: 0,
    recentUnlocked: [],
  })
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementDto | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadAchievements = async () => {
      setLoading(true)
      setError(null)
      try {
        const apiResponse = await fetch("/api/client/achievements", { cache: "no-store" })
        if (!apiResponse.ok) {
          throw new Error("achievements_request_failed")
        }

        const json = (await apiResponse.json()) as Partial<AchievementsResponse>
        if (cancelled) return

        setResponse({
          achievements: Array.isArray(json.achievements) ? json.achievements : [],
          unlockedCount: typeof json.unlockedCount === "number" ? json.unlockedCount : 0,
          totalCount: typeof json.totalCount === "number" ? json.totalCount : 0,
          recentUnlocked: Array.isArray(json.recentUnlocked) ? json.recentUnlocked : [],
        })
      } catch {
        if (cancelled) return
        setResponse({
          achievements: [],
          unlockedCount: 0,
          totalCount: 0,
          recentUnlocked: [],
        })
        setError("No fue posible cargar tus logros")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAchievements()

    return () => {
      cancelled = true
    }
  }, [])

  const achievements = response.achievements
  const totalPoints = stats.totalPoints

  useEffect(() => {
    let cancelled = false

    const loadStats = async () => {
      try {
        const apiResponse = await fetch("/api/user/stats", { cache: "no-store" })
        if (!apiResponse.ok) {
          throw new Error("stats_request_failed")
        }

        const json = (await apiResponse.json()) as Partial<{ currentStreak: number; totalPoints: number }>
        if (cancelled) return

        setStats({
          currentStreak: typeof json.currentStreak === "number" ? json.currentStreak : 0,
          totalPoints: typeof json.totalPoints === "number" ? json.totalPoints : 0,
        })
      } catch {
        if (cancelled) return
        setStats({ currentStreak: 0, totalPoints: 0 })
      }
    }

    void loadStats()

    return () => {
      cancelled = true
    }
  }, [])

  const categories = [
    "all",
    ...new Set(
      achievements
        .map((achievement) => achievement.category)
        .filter((category): category is string => Boolean(category))
    ),
  ]

  const filtered = filterCategory === "all"
    ? achievements
    : achievements.filter((a) => a.category === filterCategory)

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Trophy className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{response.unlockedCount}<span className="text-sm font-normal text-muted-foreground">/{response.totalCount}</span></p>
            <p className="text-xs text-muted-foreground">Desbloqueados</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{formatNumber(totalPoints)}</p>
            <p className="text-xs text-muted-foreground">Puntos totales</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-accent/15 mb-2">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stats.currentStreak ?? 0}</p>
            <p className="text-xs text-muted-foreground">Racha actual</p>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Cargando logros...</p>
      )}
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setFilterCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat === "all" ? "Todos" : categoryLabels[cat] || cat}
          </button>
        ))}
      </div>

      {/* Achievement Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((achievement) => {
          const IconComponent = iconMap[achievement.iconName ?? ""] || Trophy
          const isUnlocked = achievement.unlocked
          return (
            <button
              key={achievement.id}
              type="button"
              onClick={() => setSelectedAchievement(achievement)}
              className="text-left"
            >
              <Card className={`border transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                isUnlocked
                  ? "border-primary/30 bg-card"
                  : "border-border bg-muted/40"
              }`}>
                <CardContent className="flex flex-col items-center py-5 text-center">
                  <div className={`flex items-center justify-center w-14 h-14 rounded-2xl mb-3 relative ${
                    isUnlocked ? "bg-primary/15" : "bg-muted"
                  }`}>
                    <IconComponent className={`w-7 h-7 ${isUnlocked ? "text-primary" : "text-muted-foreground/40"}`} />
                    {!isUnlocked && (
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted-foreground/20 flex items-center justify-center">
                        <Lock className="w-3 h-3 text-muted-foreground/60" />
                      </div>
                    )}
                  </div>
                  <h4 className={`text-xs font-semibold mb-1 ${isUnlocked ? "text-foreground" : "text-muted-foreground"}`}>
                    {achievement.name}
                  </h4>
                  <Badge className={`text-[10px] border-0 ${categoryColors[achievement.category ?? ""] || "bg-muted text-muted-foreground"}`}>
                    {achievement.category ? (categoryLabels[achievement.category] || achievement.category) : "General"}
                  </Badge>
                  {!isUnlocked && (
                    <div className="w-full mt-2">
                      <Progress value={0} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedAchievement} onOpenChange={() => setSelectedAchievement(null)}>
        {selectedAchievement && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => {
                  const Icon = iconMap[selectedAchievement.iconName ?? ""] || Trophy
                  return <Icon className={`w-5 h-5 ${selectedAchievement.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                })()}
                {selectedAchievement.name}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <p className="text-sm text-muted-foreground">{selectedAchievement.description}</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Requisito:</span>
                  <span className="font-medium text-foreground">Disponible pronto</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Progreso:
                  </span>
                  <span className="font-medium text-foreground">
                    Disponible pronto
                  </span>
                </div>
                <Progress
                  value={selectedAchievement.unlocked ? 100 : 0}
                  className="h-2"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Categoria:</span>
                  <Badge className={`border-0 ${categoryColors[selectedAchievement.category ?? ""] || "bg-muted text-muted-foreground"}`}>
                    {selectedAchievement.category
                      ? (categoryLabels[selectedAchievement.category] || selectedAchievement.category)
                      : "General"}
                  </Badge>
                </div>
                {selectedAchievement.unlocked && selectedAchievement.unlockedAt && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Desbloqueado:</span>
                    <span className="font-medium text-primary">{formatDateLong(selectedAchievement.unlockedAt)}</span>
                  </div>
                )}
              </div>
              {selectedAchievement.unlocked ? (
                <div className="text-center py-2">
                  <Badge className="bg-primary text-primary-foreground">Desbloqueado</Badge>
                </div>
              ) : (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">
                    Disponible pronto
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
