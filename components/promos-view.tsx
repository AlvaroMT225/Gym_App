"use client"

import { useState, useMemo } from "react"
import {
  Gift,
  Tag,
  QrCode,
  Clock,
  CheckCircle2,
  Bell,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useStore, type PromoExtended, type Notification } from "@/lib/store"
import { formatDateLong } from "@/lib/utils"

export function PromosView() {
  const { promos, usePromo, notifications, markNotificationRead } = useStore()
  const [selectedPromo, setSelectedPromo] = useState<PromoExtended | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "vigente" | "expirado">("all")

  const vigentes = promos.filter((p) => p.status === "vigente")
  const expirados = promos.filter((p) => p.status === "expirado")
  const filtered = filterStatus === "all" ? promos : promos.filter((p) => p.status === filterStatus)

  const promoNotifications = useMemo(() => {
    return notifications.filter((n) => n.type === "promo").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [notifications])
  const unreadCount = promoNotifications.filter((n) => !n.read).length

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  const handleUsePromo = (id: string) => {
    setSelectedPromo(null)
  }

  const usePromoHandler = (id: string, code: string) => {
    usePromo(id)
    handleCopyCode(code)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{vigentes.length}</p>
            <p className="text-xs text-muted-foreground">Vigentes</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="flex flex-col items-center py-4 text-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted mb-2">
              <Clock className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold text-foreground">{expirados.length}</p>
            <p className="text-xs text-muted-foreground">Usadas/Expiradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Notification feed */}
      <Card className="border border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            Notificaciones de promos
            {unreadCount > 0 && (
              <Badge className="bg-destructive text-destructive-foreground text-xs border-0 ml-1">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1.5">
          {promoNotifications.length > 0 ? promoNotifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => markNotificationRead(notif.id)}
              className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                notif.read ? "bg-background" : "bg-primary/5 hover:bg-primary/10"
              }`}
            >
              <div className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${notif.read ? "bg-muted" : "bg-primary"}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${notif.read ? "text-muted-foreground" : "text-foreground font-medium"}`}>{notif.message}</p>
                <p className="text-xs text-muted-foreground">{formatDateLong(notif.date)}</p>
              </div>
            </button>
          )) : (
            <p className="text-sm text-muted-foreground text-center py-4">Sin notificaciones de promos</p>
          )}
        </CardContent>
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {(["all", "vigente", "expirado"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === status
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {status === "all" ? "Todas" : status === "vigente" ? "Vigentes" : "Usadas/Expiradas"}
          </button>
        ))}
      </div>

      {/* Promo list */}
      <div className="flex flex-col gap-3">
        {filtered.map((promo) => (
          <button
            key={promo.id}
            type="button"
            onClick={() => setSelectedPromo(promo)}
            className="text-left"
          >
            <Card className={`border transition-all duration-200 hover:shadow-md cursor-pointer ${
              promo.status === "vigente" ? "border-primary/20 hover:border-primary/40" : "border-border opacity-70"
            }`}>
              <CardContent className="flex items-start gap-3 py-4">
                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                  promo.status === "vigente" ? "bg-primary/10" : "bg-muted"
                }`}>
                  <Gift className={`w-5 h-5 ${promo.status === "vigente" ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="text-sm font-semibold text-foreground">{promo.title}</h4>
                    <Badge className={`border-0 text-xs ${
                      promo.status === "vigente" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {promo.status === "vigente" ? "Vigente" : promo.usedAt ? "Usada" : "Expirada"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{promo.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {promo.status === "vigente" ? `Valida hasta: ${formatDateLong(promo.validUntil)}` : `${promo.usedAt ? `Usada el ${formatDateLong(promo.usedAt)}` : `Expiro el ${formatDateLong(promo.validUntil)}`}`}
                  </p>
                  {promo.code && promo.status === "vigente" && (
                    <Badge variant="secondary" className="mt-2 font-mono text-xs">
                      <Tag className="w-3 h-3 mr-1" />
                      {promo.code}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPromo} onOpenChange={() => setSelectedPromo(null)}>
        {selectedPromo && (
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-primary" />
                {selectedPromo.title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-4 py-2">
              <p className="text-sm text-muted-foreground">{selectedPromo.description}</p>

              {/* Code section */}
              {selectedPromo.code && (
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-muted-foreground font-medium">Codigo:</label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 px-4 py-3 rounded-lg bg-muted font-mono text-sm font-bold text-foreground text-center tracking-wider">
                      {selectedPromo.code}
                    </div>
                    {selectedPromo.status === "vigente" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyCode(selectedPromo.code!)}
                        className="shrink-0 bg-transparent"
                      >
                        {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* QR placeholder */}
              <div className="flex flex-col items-center py-4 bg-muted rounded-lg">
                <QrCode className="w-16 h-16 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">Cupon QR (demo)</p>
              </div>

              {/* Terms */}
              {selectedPromo.terms && (
                <div className="text-xs text-muted-foreground leading-relaxed bg-muted/50 px-3 py-2 rounded-lg">
                  <span className="font-semibold">Terminos:</span> {selectedPromo.terms}
                </div>
              )}

              {/* Status info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <Badge className={`border-0 ${selectedPromo.status === "vigente" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {selectedPromo.status === "vigente" ? "Vigente" : selectedPromo.usedAt ? "Usada" : "Expirada"}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Validez:</span>
                <span className="font-medium text-foreground">{formatDateLong(selectedPromo.validUntil)}</span>
              </div>

              {selectedPromo.status === "vigente" && (
                <Button onClick={() => usePromoHandler(selectedPromo.id, selectedPromo.code!)} className="w-full">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Marcar como usada
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
