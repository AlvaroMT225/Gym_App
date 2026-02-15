"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Dumbbell, Clock, CheckCircle2, XCircle, ArrowRight } from "lucide-react"

interface Proposal {
  id: string
  type: "routine" | "session"
  title: string
  status: string
  clientId: string
  clientName: string
  clientAvatar: string
  date: string
  version: number
  changelog: string[]
}

export function TrainerProposalsView() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/trainer/proposals")
      .then((r) => (r.ok ? r.json() : { proposals: [] }))
      .then((d) => setProposals(d.proposals || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const pending = proposals.filter((p) => p.status === "proposal" || p.status === "PROPOSED" || p.status === "draft")
  const accepted = proposals.filter((p) => p.status === "accepted" || p.status === "active")
  const rejected = proposals.filter((p) => p.status === "rejected")

  if (loading) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Propuestas</h1>
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
      <h1 className="text-xl font-bold text-foreground">Propuestas</h1>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs">
            Pendientes {pending.length > 0 && `(${pending.length})`}
          </TabsTrigger>
          <TabsTrigger value="accepted" className="text-xs">
            Aceptadas {accepted.length > 0 && `(${accepted.length})`}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="text-xs">
            Rechazadas {rejected.length > 0 && `(${rejected.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-3">
          <ProposalList proposals={pending} emptyText="No hay propuestas pendientes" />
        </TabsContent>
        <TabsContent value="accepted" className="mt-3">
          <ProposalList proposals={accepted} emptyText="No hay propuestas aceptadas" />
        </TabsContent>
        <TabsContent value="rejected" className="mt-3">
          <ProposalList proposals={rejected} emptyText="No hay propuestas rechazadas" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProposalList({ proposals, emptyText }: { proposals: Proposal[]; emptyText: string }) {
  if (proposals.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
        {emptyText}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {proposals.map((p) => (
        <Link key={p.id} href={`/trainer/clients/${p.clientId}`}>
          <Card className="border border-border hover:shadow-md transition-all cursor-pointer">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
                  {p.clientAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-foreground truncate">{p.title}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">{p.clientName}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${p.type === "routine" ? "border-blue-500/30 text-blue-500" : "border-green-500/30 text-green-500"}`}
                    >
                      {p.type === "routine" ? "Rutina" : "Sesión"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                  </div>
                  {p.changelog.length > 0 && (
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {p.changelog[p.changelog.length - 1]}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <StatusIcon status={p.status} />
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(p.date).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "proposal":
    case "PROPOSED":
    case "draft":
      return <Clock className="w-4 h-4 text-amber-500" />
    case "accepted":
    case "active":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />
    case "rejected":
      return <XCircle className="w-4 h-4 text-destructive" />
    default:
      return null
  }
}
