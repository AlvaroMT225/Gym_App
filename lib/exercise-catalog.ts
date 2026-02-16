// ============================================================
// Exercise Catalog - Clasificación exacta para biblioteca
// ============================================================

export type MuscleGroup =
  | "Pecho"
  | "Espalda"
  | "Hombros"
  | "Biceps"
  | "Triceps"
  | "Cuadriceps"
  | "Femorales"
  | "Gluteos"
  | "Abductores"
  | "Core"
  | "Piernas"

export type EquipmentType = "Maquina" | "Polea" | "Peso libre"

export type Region = "upper" | "lower" | "core"

export interface ExerciseItem {
  id: string
  code: string
  name: string
  primaryMuscle: MuscleGroup
  secondaryMuscles: MuscleGroup[]
  equipment: EquipmentType
  qrEnabled: boolean
  region: Region[]
  category: string
  isMultifunctional: boolean
}

// ── Catálogo completo ────────────────────────────────────
export const exerciseCatalog: ExerciseItem[] = [
  {
    id: "SMITH-01",
    code: "SMITH-01",
    name: "Smith (Multifuncional)",
    primaryMuscle: "Pecho",
    secondaryMuscles: ["Hombros", "Espalda", "Piernas"],
    equipment: "Maquina",
    qrEnabled: true,
    region: ["upper", "lower"],
    category: "Multifuncional",
    isMultifunctional: true,
  },
  {
    id: "POLEA-01",
    code: "POLEA-01",
    name: "Polea Alta/Baja - Remo",
    primaryMuscle: "Espalda",
    secondaryMuscles: ["Biceps"],
    equipment: "Polea",
    qrEnabled: true,
    region: ["upper"],
    category: "Espalda",
    isMultifunctional: false,
  },
  {
    id: "APERT-01",
    code: "APERT-01",
    name: "Aperturas y Deltoides",
    primaryMuscle: "Pecho",
    secondaryMuscles: ["Hombros"],
    equipment: "Maquina",
    qrEnabled: true,
    region: ["upper"],
    category: "Pecho",
    isMultifunctional: false,
  },
  {
    id: "CUADR-01",
    code: "CUADR-01",
    name: "Extension de Cuadriceps",
    primaryMuscle: "Cuadriceps",
    secondaryMuscles: [],
    equipment: "Maquina",
    qrEnabled: true,
    region: ["lower"],
    category: "Cuadriceps",
    isMultifunctional: false,
  },
  {
    id: "FEMOR-01",
    code: "FEMOR-01",
    name: "Extension de Femorales",
    primaryMuscle: "Femorales",
    secondaryMuscles: ["Gluteos"],
    equipment: "Maquina",
    qrEnabled: true,
    region: ["lower"],
    category: "Isquios / Femorales",
    isMultifunctional: false,
  },
  {
    id: "ABDUC-01",
    code: "ABDUC-01",
    name: "Abductor",
    primaryMuscle: "Abductores",
    secondaryMuscles: ["Gluteos"],
    equipment: "Maquina",
    qrEnabled: true,
    region: ["lower"],
    category: "Gluteos / Abductores",
    isMultifunctional: false,
  },
]

// ── Helpers ──────────────────────────────────────────────
export function getExerciseById(id: string): ExerciseItem | undefined {
  return exerciseCatalog.find((ex) => ex.id === id)
}

export function getExercisesByRegion(region: Region): ExerciseItem[] {
  return exerciseCatalog.filter((ex) => ex.region.includes(region))
}

export function getExercisesByCategory(category: string): ExerciseItem[] {
  return exerciseCatalog.filter((ex) => ex.category === category)
}

export function getExercisesByMuscle(muscle: MuscleGroup): ExerciseItem[] {
  return exerciseCatalog.filter(
    (ex) => ex.primaryMuscle === muscle || ex.secondaryMuscles.includes(muscle)
  )
}

export function getExercisesByEquipment(equipment: EquipmentType, qrOnly?: boolean): ExerciseItem[] {
  return exerciseCatalog.filter((ex) => {
    if (ex.equipment !== equipment) return false
    if (qrOnly !== undefined) return ex.qrEnabled === qrOnly
    return true
  })
}
