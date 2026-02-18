"use client"

import { useState } from "react"
import {
  BookOpen,
  ShieldAlert,
  Edit,
  Calendar,
  FileText,
  CheckCircle,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { adminTutorials, adminPolicies, type AdminTutorial, type AdminPolicy } from "@/lib/admin-data"

export default function ContentPage() {
  const [editTutorial, setEditTutorial] = useState<AdminTutorial | null>(null)
  const [editPolicy, setEditPolicy] = useState<AdminPolicy | null>(null)

  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground text-balance">Contenido</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tutoriales por maquina y politicas de seguridad
        </p>
      </div>

      <Tabs defaultValue="tutorials">
        <TabsList className="mb-6">
          <TabsTrigger value="tutorials" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Tutoriales
          </TabsTrigger>
          <TabsTrigger value="policies" className="gap-2">
            <ShieldAlert className="w-4 h-4" />
            Politicas
          </TabsTrigger>
        </TabsList>

        {/* Tutorials Tab */}
        <TabsContent value="tutorials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adminTutorials.map((tut) => (
              <Card key={tut.id} className="border border-border hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm font-semibold text-foreground">{tut.title}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setEditTutorial(tut)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{tut.machineName}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground line-clamp-2">{tut.content}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Actualizado: {tut.updatedAt}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Policies Tab */}
        <TabsContent value="policies">
          <div className="flex flex-col gap-4">
            {adminPolicies.map((pol) => (
              <Card key={pol.id} className="border border-border hover:shadow-md transition-all duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold text-foreground">{pol.title}</CardTitle>
                      {pol.requiresAcceptance && (
                        <Badge className="bg-accent/15 text-accent border-0 text-xs">
                          Requiere aceptacion
                        </Badge>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditPolicy(pol)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-foreground">{pol.content}</p>
                  <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5" />
                    Actualizado: {pol.updatedAt}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Tutorial Sheet */}
      <Sheet open={!!editTutorial} onOpenChange={() => setEditTutorial(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Tutorial</SheetTitle>
          </SheetHeader>
          {editTutorial && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Titulo</Label>
                <Input defaultValue={editTutorial.title} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Maquina</Label>
                <Input value={editTutorial.machineName} disabled />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Contenido</Label>
                <Textarea defaultValue={editTutorial.content} rows={8} />
              </div>
              <Separator />
              <Button className="w-full gap-2">
                <CheckCircle className="w-4 h-4" />
                Guardar cambios
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Edit Policy Sheet */}
      <Sheet open={!!editPolicy} onOpenChange={() => setEditPolicy(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Politica</SheetTitle>
          </SheetHeader>
          {editPolicy && (
            <div className="mt-6 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label>Titulo</Label>
                <Input defaultValue={editPolicy.title} />
              </div>
              <div className="flex flex-col gap-2">
                <Label>Contenido</Label>
                <Textarea defaultValue={editPolicy.content} rows={8} />
              </div>
              <Separator />
              <Button className="w-full gap-2">
                <CheckCircle className="w-4 h-4" />
                Guardar cambios
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
