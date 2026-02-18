// ============================================================
// Minthy Training – Exercises Data (catálogo de ejercicios)
// ============================================================

export interface Exercise {
  id: string
  name: string
  section: string
  tab: "upper" | "lower"
  muscles: string[]
  equipment: string
  difficulty: "principiante" | "intermedio" | "avanzado"
  sets?: string
  reps?: string
  notes?: string
}

// –– Tren Superior ––––––––––––––––––––––––––––––––––––––––––––
const upperExercises: Exercise[] = [
  // Multifuncional
  { id: "ex-u1", name: "Press banca en Smith", section: "Multifuncional", tab: "upper", muscles: ["Pecho", "Triceps"], equipment: "Smith", difficulty: "intermedio", sets: "4", reps: "8-10" },
  { id: "ex-u2", name: "Press militar en Smith", section: "Multifuncional", tab: "upper", muscles: ["Hombros", "Triceps"], equipment: "Smith", difficulty: "intermedio", sets: "3", reps: "10-12" },
  { id: "ex-u3", name: "Remo inclinado en Smith", section: "Multifuncional", tab: "upper", muscles: ["Espalda", "Biceps"], equipment: "Smith", difficulty: "avanzado", sets: "4", reps: "8-10" },

  // Espalda
  { id: "ex-u4", name: "Jalon al pecho (polea alta)", section: "Espalda", tab: "upper", muscles: ["Dorsal", "Biceps"], equipment: "Polea", difficulty: "principiante", sets: "4", reps: "10-12" },
  { id: "ex-u5", name: "Remo bajo (polea baja)", section: "Espalda", tab: "upper", muscles: ["Espalda media", "Biceps"], equipment: "Polea", difficulty: "principiante", sets: "3", reps: "12" },
  { id: "ex-u6", name: "Pullover en polea", section: "Espalda", tab: "upper", muscles: ["Dorsal", "Serrato"], equipment: "Polea", difficulty: "intermedio", sets: "3", reps: "12-15" },

  // Pecho
  { id: "ex-u7", name: "Aperturas en maquina", section: "Pecho", tab: "upper", muscles: ["Pecho", "Deltoides anterior"], equipment: "Maquina aperturas", difficulty: "principiante", sets: "3", reps: "12-15" },
  { id: "ex-u8", name: "Press en maquina convergente", section: "Pecho", tab: "upper", muscles: ["Pecho", "Triceps"], equipment: "Maquina", difficulty: "intermedio", sets: "4", reps: "10" },

  // Hombros
  { id: "ex-u9", name: "Elevaciones laterales en polea", section: "Hombros", tab: "upper", muscles: ["Deltoides lateral"], equipment: "Polea", difficulty: "principiante", sets: "3", reps: "15" },
  { id: "ex-u10", name: "Face pull (polea alta)", section: "Hombros", tab: "upper", muscles: ["Deltoides posterior", "Trapecio"], equipment: "Polea", difficulty: "intermedio", sets: "3", reps: "15" },
  { id: "ex-u11", name: "Elevacion frontal en polea", section: "Hombros", tab: "upper", muscles: ["Deltoides anterior"], equipment: "Polea", difficulty: "principiante", sets: "3", reps: "12" },

  // Brazos
  { id: "ex-u12", name: "Curl biceps en polea baja", section: "Brazos", tab: "upper", muscles: ["Biceps"], equipment: "Polea", difficulty: "principiante", sets: "3", reps: "12" },
  { id: "ex-u13", name: "Extension triceps en polea alta", section: "Brazos", tab: "upper", muscles: ["Triceps"], equipment: "Polea", difficulty: "principiante", sets: "3", reps: "12" },
  { id: "ex-u14", name: "Curl martillo en polea", section: "Brazos", tab: "upper", muscles: ["Biceps", "Braquial"], equipment: "Polea", difficulty: "intermedio", sets: "3", reps: "10-12" },
]

// –– Tren Inferior + Core ––––––––––––––––––––––––––––––––––––––
const lowerExercises: Exercise[] = [
  // Cuadriceps
  { id: "ex-l1", name: "Extension de cuadriceps", section: "Cuadriceps", tab: "lower", muscles: ["Cuadriceps"], equipment: "Maquina extensiones", difficulty: "principiante", sets: "4", reps: "12-15" },
  { id: "ex-l2", name: "Sentadilla en Smith", section: "Cuadriceps", tab: "lower", muscles: ["Cuadriceps", "Gluteos"], equipment: "Smith", difficulty: "intermedio", sets: "4", reps: "10" },
  { id: "ex-l3", name: "Prensa de piernas", section: "Cuadriceps", tab: "lower", muscles: ["Cuadriceps", "Gluteos"], equipment: "Prensa", difficulty: "intermedio", sets: "4", reps: "10-12" },

  // Femorales
  { id: "ex-l4", name: "Curl femoral acostado", section: "Femorales", tab: "lower", muscles: ["Femorales"], equipment: "Maquina femorales", difficulty: "principiante", sets: "4", reps: "12" },
  { id: "ex-l5", name: "Peso muerto rumano en Smith", section: "Femorales", tab: "lower", muscles: ["Femorales", "Gluteos", "Espalda baja"], equipment: "Smith", difficulty: "avanzado", sets: "3", reps: "10" },

  // Gluteos
  { id: "ex-l6", name: "Hip thrust en Smith", section: "Gluteos", tab: "lower", muscles: ["Gluteos", "Femorales"], equipment: "Smith", difficulty: "intermedio", sets: "4", reps: "10-12" },
  { id: "ex-l7", name: "Patada de gluteo en polea", section: "Gluteos", tab: "lower", muscles: ["Gluteos"], equipment: "Polea", difficulty: "principiante", sets: "3", reps: "15" },

  // Abductores / Aductores
  { id: "ex-l8", name: "Abduccion en maquina", section: "Abductores / Aductores", tab: "lower", muscles: ["Abductores", "Gluteo medio"], equipment: "Maquina abduccion", difficulty: "principiante", sets: "3", reps: "15" },
  { id: "ex-l9", name: "Aduccion en maquina", section: "Abductores / Aductores", tab: "lower", muscles: ["Aductores"], equipment: "Maquina aduccion", difficulty: "principiante", sets: "3", reps: "15" },

  // Core
  { id: "ex-l10", name: "Crunch en polea alta", section: "Core", tab: "lower", muscles: ["Recto abdominal"], equipment: "Polea", difficulty: "intermedio", sets: "3", reps: "15-20" },
  { id: "ex-l11", name: "Rotacion rusa en polea", section: "Core", tab: "lower", muscles: ["Oblicuos"], equipment: "Polea", difficulty: "intermedio", sets: "3", reps: "12 c/lado" },
  { id: "ex-l12", name: "Plancha con peso", section: "Core", tab: "lower", muscles: ["Core completo"], equipment: "Disco", difficulty: "avanzado", sets: "3", reps: "30-45s" },
]

export const allExercises: Exercise[] = [...upperExercises, ...lowerExercises]

/** Group exercises by section for a given tab */
export function getExercisesByTab(tab: "upper" | "lower"): Record<string, Exercise[]> {
  const exercises = allExercises.filter((e) => e.tab === tab)
  const grouped: Record<string, Exercise[]> = {}
  for (const ex of exercises) {
    if (!grouped[ex.section]) grouped[ex.section] = []
    grouped[ex.section].push(ex)
  }
  return grouped
}

/** Get all section names for a tab (preserving order) */
export function getSectionsForTab(tab: "upper" | "lower"): string[] {
  const exercises = allExercises.filter((e) => e.tab === tab)
  const seen = new Set<string>()
  const sections: string[] = []
  for (const ex of exercises) {
    if (!seen.has(ex.section)) {
      seen.add(ex.section)
      sections.push(ex.section)
    }
  }
  return sections
}
