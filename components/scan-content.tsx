"use client"

import Link from "next/link"
import { ScanLine, ArrowRight } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { machines } from "@/lib/mock-data"

export function ScanContent() {
  return (
    <div className="flex flex-col gap-6">
      {/* Scan CTA */}
      <Card className="border-2 border-dashed border-primary/40 bg-primary/5 shadow-none">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-full bg-primary/15 mb-5 animate-pulse">
            <ScanLine className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-bold text-foreground mb-2">Escanea un QR</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-1 leading-relaxed">
            Apunta la camara al codigo QR de la maquina para iniciar tu sesion express. Es 10x mas rapido que el registro manual.
          </p>
        </CardContent>
      </Card>

      {/* Simulated deep links */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Simular escaneo (deep links demo)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {machines.map((machine) => (
            <Link key={machine.id} href={`/dashboard/machine/${machine.id}`}>
              <Card className="group cursor-pointer border border-border hover:border-primary/40 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                      {machine.id}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardTitle className="text-base mb-1">{machine.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{machine.muscles.join(", ")}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
