"use client"

import { useState } from "react"

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
  X,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useStore, type AchievementExtended } from "@/lib/store"
import { formatNumber, formatDateLong } from "@/lib/utils"

const iconMap: Record<string, typeof Zap> = {
  Zap, Flame, Trophy, Target, Shield, TrendingUp, Swords, Medal, Sun, QrCode,
}

const categoryLabels: Record<string, string> = {
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
  const { achievements, user, sessions } = useStore()

  // Compute best weight across all sessions for the "100 kg Club" achievement
  const bestWeight = (() => {
    let max = 0
    for (const session of sessions) {
      for (const set of session.sets) {
        if (set.weight > max) max = set.weight
      }
    }
    return max || 80 // default 80 when no session data
  })()
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementExtended | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const unlocked = achievements.filter((a) => a.unlocked)
  const locked = achievements.filter((a) => !a.unlocked)
  const totalPoints = user.totalPoints

  const categories = ["all", ...new Set(achievements.map((a) => a.category))]

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
            <p className="text-2xl font-bold text-foreground">{unlocked.length}<span className="text-sm font-normal text-muted-foreground">/{achievements.length}</span></p>
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
            <p className="text-2xl font-bold text-foreground">{user.scanStreak}</p>
            <p className="text-xs text-muted-foreground">Racha actual</p>
          </CardContent>
        </Card>
      </div>

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
          const IconComponent = iconMap[achievement.icon] || Trophy
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
                    {achievement.title}
                  </h4>
                  <Badge className={`text-[10px] border-0 ${categoryColors[achievement.category] || "bg-muted text-muted-foreground"}`}>
                    {categoryLabels[achievement.category] || achievement.category}
                  </Badge>
                  {!isUnlocked && (
                    <div className="w-full mt-2">
                      <Progress value={(achievement.progress / achievement.goal) * 100} className="h-1.5" />
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
                  const Icon = iconMap[selectedAchievement.icon] || Trophy
                  return <Icon className={`w-5 h-5 ${selectedAchievement.unlocked ? "text-primary" : "text-muted-foreground"}`} />
                })()}
                {selectedAchievement.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <p className="text-sm text-muted-foreground">{selectedAchievement.description}</p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Requisito:</span>
                  <span className="font-medium text-foreground">{selectedAchievement.requirement}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {selectedAchievement.id === "a3" ? "Mejor set:" : "Progreso:"}
                  </span>
                  <span className="font-medium text-foreground">
                    {selectedAchievement.id === "a3"
                      ? `${bestWeight}/100 kg`
                      : `${formatNumber(selectedAchievement.progress)} / ${formatNumber(selectedAchievement.goal)}`}
                  </span>
                </div>
                <Progress
                  value={
                    selectedAchievement.id === "a3"
                      ? Math.min((bestWeight / 100) * 100, 100)
                      : (selectedAchievement.progress / selectedAchievement.goal) * 100
                  }
                  className="h-2"
                />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Categoria:</span>
                  <Badge className={`border-0 ${categoryColors[selectedAchievement.category]}`}>
                    {categoryLabels[selectedAchievement.category]}
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
                    {selectedAchievement.id === "a3"
                      ? `${Math.round(Math.min((bestWeight / 100) * 100, 100))}% completado. Sigue entrenando.`
                      : `${Math.round((selectedAchievement.progress / selectedAchievement.goal) * 100)}% completado. Sigue entrenando.`}
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
