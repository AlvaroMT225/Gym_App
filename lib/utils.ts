import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Deterministic number formatter that avoids hydration mismatches */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n)
}

const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const MONTHS_LONG = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

/** Deterministic short date: "9 feb" */
export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

/** Deterministic long date: "15 de marzo de 2026" */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`
}
