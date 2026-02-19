"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Settings, User, Clock, Bell, Save } from "lucide-react"

interface AvailabilitySlot {
  day: string
  from: string
  to: string
  enabled: boolean
}

interface TrainerSettingsData {
  bio: string
  specialties: string[]
  availability: AvailabilitySlot[]
  maxClients: number
  notifyNewClient: boolean
  notifyProposalResponse: boolean
  notifyConsentExpiry: boolean
}

interface ProfileData {
  name: string
  email: string
  avatar: string
}

export function TrainerSettingsView() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [settings, setSettings] = useState<TrainerSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/trainer/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setProfile(d.profile)
          setSettings(d.settings)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    if (!settings) return
    setSaving(true)
    setSaved(false)
    try {
      await fetch("/api/trainer/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    setSaving(false)
  }

  if (loading || !settings || !profile) {
    return (
      <div className="p-4 sm:p-6 space-y-4">
        <h1 className="text-xl font-bold text-foreground">Ajustes</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Settings className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold text-foreground">Ajustes</h1>
      </div>

      {/* Profile Section */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            Perfil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground text-sm font-bold">
              {profile.avatar}
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{profile.name}</p>
              <p className="text-xs text-muted-foreground">{profile.email}</p>
            </div>
          </div>

          <div>
            <Label className="text-xs">Bio</Label>
            <textarea
              value={settings.bio}
              onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
              rows={3}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe tu experiencia y especialidades..."
            />
          </div>

          <div>
            <Label className="text-xs">Especialidades</Label>
            <div className="flex flex-wrap gap-1 mt-1">
              {settings.specialties.map((s, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Availability Section */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            Disponibilidad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {settings.availability.map((slot, idx) => (
              <div key={slot.day} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const updated = [...settings.availability]
                    updated[idx] = { ...updated[idx], enabled: !updated[idx].enabled }
                    setSettings({ ...settings, availability: updated })
                  }}
                  className={`w-20 text-xs font-medium py-1.5 rounded transition-colors text-left px-2 ${
                    slot.enabled ? "text-foreground" : "text-muted-foreground line-through"
                  }`}
                >
                  {slot.day}
                </button>
                {slot.enabled ? (
                  <>
                    <Input
                      type="time"
                      value={slot.from}
                      onChange={(e) => {
                        const updated = [...settings.availability]
                        updated[idx] = { ...updated[idx], from: e.target.value }
                        setSettings({ ...settings, availability: updated })
                      }}
                      className="w-24 h-8 text-xs"
                    />
                    <span className="text-xs text-muted-foreground">-</span>
                    <Input
                      type="time"
                      value={slot.to}
                      onChange={(e) => {
                        const updated = [...settings.availability]
                        updated[idx] = { ...updated[idx], to: e.target.value }
                        setSettings({ ...settings, availability: updated })
                      }}
                      className="w-24 h-8 text-xs"
                    />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">Descanso</span>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            Preferencias
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-xs">Máximo de atletas</Label>
            <Input
              type="number"
              value={settings.maxClients}
              onChange={(e) => setSettings({ ...settings, maxClients: parseInt(e.target.value) || 0 })}
              className="w-24 h-8 text-xs mt-1"
              min={1}
              max={50}
            />
          </div>

          <div className="space-y-2">
            <ToggleRow
              label="Notificar nuevo atleta"
              checked={settings.notifyNewClient}
              onChange={(v) => setSettings({ ...settings, notifyNewClient: v })}
            />
            <ToggleRow
              label="Notificar respuesta a propuesta"
              checked={settings.notifyProposalResponse}
              onChange={(v) => setSettings({ ...settings, notifyProposalResponse: v })}
            />
            <ToggleRow
              label="Notificar vencimiento de consentimiento"
              checked={settings.notifyConsentExpiry}
              onChange={(v) => setSettings({ ...settings, notifyConsentExpiry: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={saving} className="w-full">
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Guardando..." : saved ? "Guardado" : "Guardar cambios"}
      </Button>
    </div>
  )
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-foreground">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-9 h-5 rounded-full transition-colors relative ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  )
}
