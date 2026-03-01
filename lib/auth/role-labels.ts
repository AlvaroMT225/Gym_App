import type { AppRole } from "./types"

type RoleInput = AppRole | string | null | undefined

const ROLE_LABELS: Record<string, string> = {
  athlete: "Atleta",
  coach: "Entrenador",
  admin: "Admin",
}

export function getRoleLabel(role: RoleInput): string {
  if (role == null) return "Usuario"

  const normalizedRole = role.trim().toLowerCase()
  return ROLE_LABELS[normalizedRole] ?? "Usuario"
}
