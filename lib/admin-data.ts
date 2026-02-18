// ============================================================
// Minthy Training – Admin Mock Data
// ============================================================

export interface AdminMember {
  id: string
  name: string
  email: string
  avatar: string
  plan: string
  status: "al_dia" | "por_vencer" | "vencido"
  nextPayment: string
  memberSince: string
  phone: string
  notes: string
  paymentHistory: { date: string; amount: number; method: string; reference: string; registeredBy: string }[]
}

export interface AdminPayment {
  id: string
  memberId: string
  memberName: string
  date: string
  amount: number
  method: string
  reference: string
  status: "pagado" | "pendiente" | "vencido"
  registeredBy: string
}

export interface AdminMachine {
  id: string
  name: string
  group: string
  status: "activa" | "mantenimiento" | "inactiva"
  location: string
  qrCode: string
  tutorialId: string
  safetyRequired: boolean
}

export interface AdminPromo {
  id: string
  title: string
  description: string
  code: string
  validFrom: string
  validUntil: string
  status: "activa" | "expirada" | "borrador"
  segment: string
  redemptions: number
  views: number
}

export interface AdminTutorial {
  id: string
  machineId: string
  machineName: string
  title: string
  content: string
  updatedAt: string
}

export interface AdminPolicy {
  id: string
  title: string
  content: string
  requiresAcceptance: boolean
  updatedAt: string
}

export interface StaffMember {
  id: string
  name: string
  email: string
  avatar: string
  role: "ADMIN" | "TRAINER"
  status: "activo" | "inactivo"
  joinedAt: string
  permissions: string[]
}

export interface GymSettings {
  gymName: string
  plans: { id: string; name: string; price: number; duration: string }[]
  schedule: { day: string; open: string; close: string }[]
  expirationRules: string
  branding: { primaryColor: string; logo: string }
}

// –– Mock Members ––––––––––––––––––––––––––––––––––––––––––––––
export const adminMembers: AdminMember[] = [
  {
    id: "u1", name: "Alex Trainer", email: "alex@minthy.app", avatar: "AT",
    plan: "Mensual", status: "por_vencer", nextPayment: "2026-02-15",
    memberSince: "2026-01-10", phone: "+52 55 1234 5678", notes: "Prefiere horario matutino",
    paymentHistory: [
      { date: "2026-01-10", amount: 45, method: "Tarjeta", reference: "TXN-001", registeredBy: "Admin Minthy" },
      { date: "2025-12-10", amount: 45, method: "Tarjeta", reference: "TXN-002", registeredBy: "Admin Minthy" },
    ],
  },
  {
    id: "u2", name: "Carlos Martinez", email: "carlos@email.com", avatar: "CM",
    plan: "Trimestral", status: "al_dia", nextPayment: "2026-04-01",
    memberSince: "2025-10-15", phone: "+52 55 2345 6789", notes: "",
    paymentHistory: [
      { date: "2026-01-01", amount: 120, method: "Transferencia", reference: "TXN-003", registeredBy: "Admin Minthy" },
    ],
  },
  {
    id: "u3", name: "Ana Rodriguez", email: "ana@email.com", avatar: "AR",
    plan: "Mensual", status: "vencido", nextPayment: "2026-02-10",
    memberSince: "2025-11-20", phone: "+52 55 3456 7890", notes: "Tiene lesion en rodilla derecha",
    paymentHistory: [
      { date: "2025-12-10", amount: 45, method: "Efectivo", reference: "EFT-001", registeredBy: "Coach Maria" },
    ],
  },
  {
    id: "u4", name: "Luis Perez", email: "luis@email.com", avatar: "LP",
    plan: "Semanal", status: "por_vencer", nextPayment: "2026-02-12",
    memberSince: "2026-02-01", phone: "+52 55 4567 8901", notes: "Nuevo miembro, necesita induccion",
    paymentHistory: [
      { date: "2026-02-01", amount: 15, method: "Efectivo", reference: "EFT-002", registeredBy: "Admin Minthy" },
    ],
  },
  {
    id: "u5", name: "Maria Garcia", email: "maria@email.com", avatar: "MG",
    plan: "Anual", status: "al_dia", nextPayment: "2026-12-01",
    memberSince: "2025-06-01", phone: "+52 55 5678 9012", notes: "Miembro premium, renovacion automatica",
    paymentHistory: [
      { date: "2025-12-01", amount: 450, method: "Tarjeta", reference: "TXN-010", registeredBy: "Admin Minthy" },
    ],
  },
  {
    id: "u6", name: "Roberto Sanchez", email: "roberto@email.com", avatar: "RS",
    plan: "Mensual", status: "vencido", nextPayment: "2026-01-28",
    memberSince: "2025-09-15", phone: "+52 55 6789 0123", notes: "",
    paymentHistory: [
      { date: "2025-12-28", amount: 45, method: "Transferencia", reference: "TXN-011", registeredBy: "Admin Minthy" },
    ],
  },
  {
    id: "u7", name: "Sofia Torres", email: "sofia@email.com", avatar: "ST",
    plan: "Mensual", status: "al_dia", nextPayment: "2026-03-05",
    memberSince: "2025-08-10", phone: "+52 55 7890 1234", notes: "Clase de yoga tambien",
    paymentHistory: [
      { date: "2026-02-05", amount: 45, method: "Tarjeta", reference: "TXN-012", registeredBy: "Admin Minthy" },
    ],
  },
  {
    id: "u8", name: "Diego Flores", email: "diego@email.com", avatar: "DF",
    plan: "Trimestral", status: "al_dia", nextPayment: "2026-05-01",
    memberSince: "2025-07-20", phone: "+52 55 8901 2345", notes: "",
    paymentHistory: [
      { date: "2026-02-01", amount: 120, method: "Tarjeta", reference: "TXN-013", registeredBy: "Admin Minthy" },
    ],
  },
]

// –– Mock Payments –––––––––––––––––––––––––––––––––––––––––––––
export const adminPayments: AdminPayment[] = [
  { id: "pay-1", memberId: "u7", memberName: "Sofia Torres", date: "2026-02-05", amount: 45, method: "Tarjeta", reference: "TXN-012", status: "pagado", registeredBy: "Admin Minthy" },
  { id: "pay-2", memberId: "u8", memberName: "Diego Flores", date: "2026-02-01", amount: 120, method: "Tarjeta", reference: "TXN-013", status: "pagado", registeredBy: "Admin Minthy" },
  { id: "pay-3", memberId: "u4", memberName: "Luis Perez", date: "2026-02-01", amount: 15, method: "Efectivo", reference: "EFT-002", status: "pagado", registeredBy: "Admin Minthy" },
  { id: "pay-4", memberId: "u2", memberName: "Carlos Martinez", date: "2026-01-01", amount: 120, method: "Transferencia", reference: "TXN-003", status: "pagado", registeredBy: "Admin Minthy" },
  { id: "pay-5", memberId: "u1", memberName: "Alex Trainer", date: "2026-01-10", amount: 45, method: "Tarjeta", reference: "TXN-001", status: "pagado", registeredBy: "Admin Minthy" },
]

// –– Mock Machines –––––––––––––––––––––––––––––––––––––––––––––
export const adminMachines: AdminMachine[] = [
  { id: "SMITH-01", name: "Smith (Multifuncional)", group: "Multifuncional", status: "activa", location: "Zona A", qrCode: "QR-SMITH-01", tutorialId: "tut-1", safetyRequired: true },
  { id: "POLEA-01", name: "Polea Alta/Baja - Remo", group: "Espalda", status: "activa", location: "Zona B", qrCode: "QR-POLEA-01", tutorialId: "tut-2", safetyRequired: true },
  { id: "APERT-01", name: "Aperturas y Deltoides", group: "Pecho", status: "activa", location: "Zona A", qrCode: "QR-APERT-01", tutorialId: "tut-3", safetyRequired: false },
  { id: "ABDUC-01", name: "Abductor", group: "Piernas", status: "mantenimiento", location: "Zona C", qrCode: "QR-ABDUC-01", tutorialId: "tut-4", safetyRequired: false },
  { id: "CUADR-01", name: "Extension de Cuadriceps", group: "Piernas", status: "activa", location: "Zona C", qrCode: "QR-CUADR-01", tutorialId: "tut-5", safetyRequired: true },
  { id: "FEMOR-01", name: "Extension de Femorales", group: "Piernas", status: "inactiva", location: "Zona C", qrCode: "QR-FEMOR-01", tutorialId: "tut-6", safetyRequired: true },
]

// –– Mock Promos –––––––––––––––––––––––––––––––––––––––––––––––
export const adminPromos: AdminPromo[] = [
  { id: "p1", title: "20% en Suplementos", description: "Descuento en tienda del gym", code: "MINTHY20", validFrom: "2026-02-01", validUntil: "2026-02-28", status: "activa", segment: "Todos", redemptions: 12, views: 145 },
  { id: "p2", title: "Clase Gratis de Spinning", description: "Una clase sin costo", code: "SPIN-FREE", validFrom: "2026-02-10", validUntil: "2026-02-20", status: "activa", segment: "Nuevos", redemptions: 5, views: 89 },
  { id: "p3", title: "Trae un amigo", description: "Amigo entrena gratis 1 semana", code: "AMIGO25", validFrom: "2026-02-01", validUntil: "2026-03-15", status: "activa", segment: "Activos", redemptions: 8, views: 210 },
  { id: "p4", title: "10% en Plan Anual", description: "Descuento al cambiar a anual", code: "ANUAL10", validFrom: "2026-01-01", validUntil: "2026-01-31", status: "expirada", segment: "Todos", redemptions: 3, views: 67 },
]

// –– Mock Tutorials ––––––––––––––––––––––––––––––––––––––––––––
export const adminTutorials: AdminTutorial[] = [
  { id: "tut-1", machineId: "SMITH-01", machineName: "Smith (Multifuncional)", title: "Uso correcto del Smith", content: "Ajusta la barra a la altura adecuada. Mantiene la espalda recta...", updatedAt: "2026-02-01" },
  { id: "tut-2", machineId: "POLEA-01", machineName: "Polea Alta/Baja - Remo", title: "Tecnica de remo en polea", content: "Selecciona el agarre adecuado. Mantiene los codos pegados...", updatedAt: "2026-01-28" },
  { id: "tut-3", machineId: "APERT-01", machineName: "Aperturas y Deltoides", title: "Aperturas seguras", content: "No uses exceso de peso. Controla el movimiento en todo momento...", updatedAt: "2026-01-25" },
  { id: "tut-4", machineId: "ABDUC-01", machineName: "Abductor", title: "Uso del abductor", content: "Ajusta la amplitud de movimiento. Mantiene la postura...", updatedAt: "2026-01-20" },
  { id: "tut-5", machineId: "CUADR-01", machineName: "Extension de Cuadriceps", title: "Extension de cuadriceps", content: "Ajusta el rodillo a la altura del tobillo...", updatedAt: "2026-01-15" },
  { id: "tut-6", machineId: "FEMOR-01", machineName: "Extension de Femorales", title: "Extension de femorales", content: "Ajusta el rodillo detras del tobillo...", updatedAt: "2026-01-10" },
]

// –– Mock Policies –––––––––––––––––––––––––––––––––––––––––––––
export const adminPolicies: AdminPolicy[] = [
  { id: "pol-1", title: "Reglamento General", content: "Todo miembro debe respetar los horarios y mantener el equipo limpio despues de usarlo...", requiresAcceptance: true, updatedAt: "2026-01-01" },
  { id: "pol-2", title: "Politica de Seguridad", content: "Es obligatorio completar el tutorial de seguridad antes de usar cualquier maquina marcada como obligatoria...", requiresAcceptance: true, updatedAt: "2026-01-05" },
  { id: "pol-3", title: "Politica de Cancelacion", content: "Los planes pueden cancelarse con 15 dias de anticipacion. No se realizan reembolsos parciales...", requiresAcceptance: false, updatedAt: "2025-12-15" },
]

// –– Mock Staff ––––––––––––––––––––––––––––––––––––––––––––––––
export const adminStaff: StaffMember[] = [
  { id: "admin-1", name: "Admin Minthy", email: "admin@minty.demo", avatar: "AM", role: "ADMIN", status: "activo", joinedAt: "2025-01-01", permissions: ["all"] },
  { id: "trainer-1", name: "Coach Maria", email: "trainer@minty.demo", avatar: "CM", role: "TRAINER", status: "activo", joinedAt: "2025-06-15", permissions: ["workouts:read", "workouts:write", "clients:read", "clients:assign"] },
  { id: "trainer-2", name: "Coach Pedro", email: "pedro@minty.demo", avatar: "CP", role: "TRAINER", status: "activo", joinedAt: "2025-09-01", permissions: ["workouts:read", "workouts:write", "clients:read"] },
  { id: "trainer-3", name: "Coach Laura", email: "laura@minty.demo", avatar: "CL", role: "TRAINER", status: "inactivo", joinedAt: "2025-03-10", permissions: ["workouts:read", "clients:read"] },
]

// –– Mock Gym Settings –––––––––––––––––––––––––––––––––––––––––
export const gymSettings: GymSettings = {
  gymName: "Minthy Training Center",
  plans: [
    { id: "plan-1", name: "Semanal", price: 15, duration: "7 dias" },
    { id: "plan-2", name: "Mensual", price: 45, duration: "30 dias" },
    { id: "plan-3", name: "Trimestral", price: 120, duration: "90 dias" },
    { id: "plan-4", name: "Anual", price: 450, duration: "365 dias" },
  ],
  schedule: [
    { day: "Lunes a Viernes", open: "06:00", close: "22:00" },
    { day: "Sabado", open: "07:00", close: "20:00" },
    { day: "Domingo", open: "08:00", close: "14:00" },
  ],
  expirationRules: "El acceso se suspende automaticamente al dia siguiente del vencimiento. Se envian recordatorios 3 dias antes y el dia del vencimiento.",
  branding: { primaryColor: "#0d9668", logo: "/logo.png" },
}

// –– KPI helpers –––––––––––––––––––––––––––––––––––––––––––––––
export function getAdminKPIs() {
  const alDia = adminMembers.filter((m) => m.status === "al_dia").length
  const porVencer = adminMembers.filter((m) => m.status === "por_vencer").length
  const vencidos = adminMembers.filter((m) => m.status === "vencido").length
  const pagosHoy = adminPayments.filter((p) => p.date === "2026-02-05").length
  const promosActivas = adminPromos.filter((p) => p.status === "activa").length
  const incidencias = adminMachines.filter((m) => m.status !== "activa").length

  return { alDia, porVencer, vencidos, pagosHoy, promosActivas, incidencias }
}
