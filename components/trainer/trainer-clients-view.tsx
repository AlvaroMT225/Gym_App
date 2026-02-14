"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Users, ArrowRight, Search, X } from "lucide-react"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateLong } from "@/lib/utils"

type ClientEntry = {
  client: {
    id: string
    name: string
    alias: string
    avatar: string
    memberSince: string
    goal: string
  }
  consent: {
    id: string
    status: "ACTIVE" | "REVOKED" | "EXPIRED"
    scopes: string[]
    expires_at: string | null
  }
}

const scopeLabels: Record<string, string> = {
  "sessions:read": "Sesiones",
  "sessions:comment": "Comentarios",
  "routines:read": "Rutinas",
  "routines:write": "Editar rutinas",
  "exercises:read": "Ejercicios",
  "progress:read": "Progreso",
  "prs:read": "PRs",
  "achievements:read": "Logros",
  "goals:write": "Objetivos",
}

function formatExpiry(expiresAt: string | null) {
  if (!expiresAt) return { label: "Sin vencimiento", accent: "text-muted-foreground" }
  const now = new Date()
  const exp = new Date(expiresAt)
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays <= 0) {
    return { label: `Expira el ${formatDateLong(expiresAt)}`, accent: "text-destructive" }
  }
  if (diffDays <= 7) {
    return { label: `Expira en ${diffDays} dias`, accent: "text-accent" }
  }
  return { label: `Expira el ${formatDateLong(expiresAt)}`, accent: "text-muted-foreground" }
}

export function TrainerClientsView() {
  const [clients, setClients] = useState<ClientEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [expiryFilter, setExpiryFilter] = useState("all")
  const [scopeFilter, setScopeFilter] = useState("all")
  const [sortBy, setSortBy] = useState("name-asc")

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const res = await fetch("/api/trainer/clients")
        if (!res.ok) {
          throw new Error("No se pudo cargar la lista de clientes")
        }
        const data = await res.json()
        if (active) setClients(data.clients || [])
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Error inesperado")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // Filter and sort clients
  const filteredAndSortedClients = useMemo(() => {
    let result = [...clients]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(({ client }) =>
        client.name.toLowerCase().includes(query) ||
        client.alias.toLowerCase().includes(query)
      )
    }

    // Expiry filter
    if (expiryFilter !== "all") {
      result = result.filter(({ consent }) => {
        if (expiryFilter === "no-expiry") return !consent.expires_at
        if (expiryFilter === "expiring-soon" && consent.expires_at) {
          const now = new Date()
          const expiry = new Date(consent.expires_at)
          const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          return diffDays > 0 && diffDays <= 7
        }
        return true
      })
    }

    // Scope filter
    if (scopeFilter !== "all") {
      result = result.filter(({ consent }) => consent.scopes.includes(scopeFilter))
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.client.name.localeCompare(b.client.name)
        case "name-desc":
          return b.client.name.localeCompare(a.client.name)
        case "expiry-nearest": {
          const aTime = a.consent.expires_at ? new Date(a.consent.expires_at).getTime() : Infinity
          const bTime = b.consent.expires_at ? new Date(b.consent.expires_at).getTime() : Infinity
          return aTime - bTime
        }
        case "expiry-farthest": {
          const aTime = a.consent.expires_at ? new Date(a.consent.expires_at).getTime() : -Infinity
          const bTime = b.consent.expires_at ? new Date(b.consent.expires_at).getTime() : -Infinity
          return bTime - aTime
        }
        default:
          return 0
      }
    })

    return result
  }, [clients, searchQuery, expiryFilter, scopeFilter, sortBy])

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Mis Clientes"
        description="Solo aparecen clientes con consentimiento activo y vigente."
        icon={Users}
      />

      {!loading && !error && clients.length > 0 && (
        <div className="mb-6 flex flex-col gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filters and Sort */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select value={expiryFilter} onValueChange={setExpiryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Vencimiento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="expiring-soon">Próximos a vencer (≤7 días)</SelectItem>
                <SelectItem value="no-expiry">Sin vencimiento</SelectItem>
              </SelectContent>
            </Select>

            <Select value={scopeFilter} onValueChange={setScopeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Scope" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los scopes</SelectItem>
                <SelectItem value="sessions:read">Sesiones</SelectItem>
                <SelectItem value="routines:read">Rutinas</SelectItem>
                <SelectItem value="progress:read">Progreso</SelectItem>
                <SelectItem value="prs:read">PRs</SelectItem>
                <SelectItem value="achievements:read">Logros</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Nombre A-Z</SelectItem>
                <SelectItem value="name-desc">Nombre Z-A</SelectItem>
                <SelectItem value="expiry-nearest">Vencimiento más próximo</SelectItem>
                <SelectItem value="expiry-farthest">Vencimiento más lejano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear filters button */}
          {(searchQuery || expiryFilter !== "all" || scopeFilter !== "all" || sortBy !== "name-asc") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setExpiryFilter("all")
                setScopeFilter("all")
                setSortBy("name-asc")
              }}
              className="self-start gap-1 bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Cargando clientes...</p>
      ) : error ? (
        <Card className="border border-destructive/30 bg-destructive/5">
          <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
        </Card>
      ) : clients.length === 0 ? (
        <Card className="border border-dashed border-border bg-muted/40">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Aun no tienes clientes con consentimiento activo.
          </CardContent>
        </Card>
      ) : filteredAndSortedClients.length === 0 ? (
        <Card className="border border-dashed border-border bg-muted/40">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              Sin resultados para los filtros aplicados.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("")
                setExpiryFilter("all")
                setScopeFilter("all")
                setSortBy("name-asc")
              }}
              className="gap-1 bg-transparent"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar filtros
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedClients.map(({ client, consent }) => {
                  const expiry = formatExpiry(consent.expires_at)
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary font-semibold">
                            {client.avatar}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">{client.name}</p>
                            <p className="text-xs text-muted-foreground">{client.alias}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-success/10 text-success border-0">Activo</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {consent.scopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-[10px]">
                              {scopeLabels[scope] ?? scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs ${expiry.accent}`}>{expiry.label}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" className="gap-1">
                          <Link href={`/trainer/clients/${client.id}`}>
                            Ver cliente
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

