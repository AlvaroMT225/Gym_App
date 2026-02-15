"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Dumbbell, Search } from "lucide-react"

interface Exercise {
  id: string
  name: string
  muscles: string[]
  category: string
  machine: string
  description: string
}

const CATEGORIES = ["Todos", "Pecho", "Piernas", "Espalda"]

export function TrainerExercisesView() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todos")

  useEffect(() => {
    fetch("/api/trainer/exercises")
      .then((r) => (r.ok ? r.json() : { exercises: [] }))
      .then((d) => setExercises(d.exercises || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = exercises.filter((ex) => {
    const matchesSearch = search === "" ||
      ex.name.toLowerCase().includes(search.toLowerCase()) ||
      ex.muscles.some((m) => m.toLowerCase().includes(search.toLowerCase()))
    const matchesCategory = selectedCategory === "Todos" || ex.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Ejercicios</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Dumbbell className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Ejercicios</h1>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o músculo..."
          className="pl-9"
        />
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <p className="text-xs text-muted-foreground">{filtered.length} ejercicios</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((ex) => (
          <Card key={ex.id} className="border border-border">
            <CardContent className="p-3">
              <h4 className="text-sm font-semibold text-foreground mb-1">{ex.name}</h4>
              <p className="text-xs text-muted-foreground mb-2">{ex.description}</p>
              <div className="flex flex-wrap gap-1 mb-1.5">
                {ex.muscles.map((m) => (
                  <Badge key={m} variant="secondary" className="text-[10px]">
                    {m}
                  </Badge>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                <span className="font-medium">Máquina:</span> {ex.machine}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Dumbbell className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No se encontraron ejercicios
        </div>
      )}
    </div>
  )
}
