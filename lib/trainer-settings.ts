export interface AvailabilitySlot {
  day: string
  from: string
  to: string
  enabled: boolean
}

export interface TrainerSettings {
  trainerId: string
  bio: string
  specialties: string[]
  availability: AvailabilitySlot[]
  maxClients: number
  notifyNewClient: boolean
  notifyProposalResponse: boolean
  notifyConsentExpiry: boolean
}

const settingsStore: Map<string, TrainerSettings> = new Map([
  [
    "demo-trainer",
    {
      trainerId: "demo-trainer",
      bio: "Entrenador personal certificado con 5 años de experiencia en fuerza e hipertrofia.",
      specialties: ["Fuerza", "Hipertrofia", "Rehabilitación"],
      availability: [
        { day: "Lunes", from: "08:00", to: "14:00", enabled: true },
        { day: "Martes", from: "08:00", to: "14:00", enabled: true },
        { day: "Miércoles", from: "08:00", to: "14:00", enabled: true },
        { day: "Jueves", from: "08:00", to: "14:00", enabled: true },
        { day: "Viernes", from: "08:00", to: "12:00", enabled: true },
        { day: "Sábado", from: "09:00", to: "12:00", enabled: false },
        { day: "Domingo", from: "", to: "", enabled: false },
      ],
      maxClients: 15,
      notifyNewClient: true,
      notifyProposalResponse: true,
      notifyConsentExpiry: true,
    },
  ],
])

export function getTrainerSettings(trainerId: string): TrainerSettings {
  const existing = settingsStore.get(trainerId)
  if (existing) return { ...existing }

  const defaults: TrainerSettings = {
    trainerId,
    bio: "",
    specialties: [],
    availability: [
      { day: "Lunes", from: "08:00", to: "14:00", enabled: true },
      { day: "Martes", from: "08:00", to: "14:00", enabled: true },
      { day: "Miércoles", from: "08:00", to: "14:00", enabled: true },
      { day: "Jueves", from: "08:00", to: "14:00", enabled: true },
      { day: "Viernes", from: "08:00", to: "12:00", enabled: true },
      { day: "Sábado", from: "", to: "", enabled: false },
      { day: "Domingo", from: "", to: "", enabled: false },
    ],
    maxClients: 10,
    notifyNewClient: true,
    notifyProposalResponse: true,
    notifyConsentExpiry: true,
  }
  settingsStore.set(trainerId, defaults)
  return { ...defaults }
}

export function updateTrainerSettings(
  trainerId: string,
  input: Partial<Omit<TrainerSettings, "trainerId">>
): TrainerSettings {
  const current = getTrainerSettings(trainerId)
  const updated: TrainerSettings = {
    ...current,
    bio: input.bio ?? current.bio,
    specialties: input.specialties ?? current.specialties,
    availability: input.availability ?? current.availability,
    maxClients: input.maxClients ?? current.maxClients,
    notifyNewClient: input.notifyNewClient ?? current.notifyNewClient,
    notifyProposalResponse: input.notifyProposalResponse ?? current.notifyProposalResponse,
    notifyConsentExpiry: input.notifyConsentExpiry ?? current.notifyConsentExpiry,
  }
  settingsStore.set(trainerId, updated)
  return { ...updated }
}
