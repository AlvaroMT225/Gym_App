"use client"

import { useState } from "react"
import Link from "next/link"
import { Dumbbell, Mail, Lock, LogIn, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth/auth-context"

const DEMO_ACCOUNTS = [
  { label: "Admin", email: "admin@minty.demo", password: "Admin123!", role: "ADMIN" as const },
  { label: "Trainer", email: "trainer@minty.demo", password: "Trainer123!", role: "TRAINER" as const },
  { label: "User", email: "user@minty.demo", password: "User123!", role: "USER" as const },
]

export default function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)
    const result = await login(email, password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  const handleDemoLogin = async (demo: (typeof DEMO_ACCOUNTS)[0]) => {
    setEmail(demo.email)
    setPassword(demo.password)
    setError("")
    setLoading(true)
    const result = await login(demo.email, demo.password)
    if (result.error) setError(result.error)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md flex flex-col gap-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary">
            <Dumbbell className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground">Minthy Training</h1>
            <p className="text-sm text-muted-foreground">Inicia sesion en tu cuenta</p>
          </div>
        </div>

        {/* Login form */}
        <Card className="border border-border">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Correo electronico</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password">Contrasena</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Tu contrasena"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    autoComplete="current-password"
                    required
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                <LogIn className="w-4 h-4 mr-2" />
                {loading ? "Iniciando sesion..." : "Iniciar sesion"}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground">
                No tienes cuenta?{" "}
                <Link href="/register" className="text-primary font-medium hover:underline">
                  Registrate
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo accounts */}
        <Card className="border border-dashed border-primary/30 bg-primary/5 shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Cuentas demo para probar
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => handleDemoLogin(demo)}
                disabled={loading}
                className="flex items-center justify-between px-3 py-2.5 bg-background rounded-lg hover:bg-muted transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-foreground">{demo.email}</p>
                  <p className="text-xs text-muted-foreground">{demo.password}</p>
                </div>
                <Badge className="bg-primary/10 text-primary border-0 text-xs">
                  {demo.role}
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
