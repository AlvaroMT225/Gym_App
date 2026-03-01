"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Gift,
  Tag,
  QrCode,
  Clock,
  CheckCircle2,
  Bell,
  Copy,
  Check,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useStore, type Notification } from "@/lib/store"
import { formatDateLong } from "@/lib/utils"

// ── DTOs matching API response ────────────────────────────────

interface PromotionDto {
  id: string
  title: string
  description: string | null
  code: string | null
  discountType: string | null
  discountValue: number
  startsAt: string | null
  expiresAt: string | null
  maxUses: number | null
  usesCount: number
  status: string        // DB: 'active' | 'inactive' | 'expired'
  redeemed: boolean
  redeemedAt: string | null
}

// Adds computed uiStatus for UI logic
interface PromoView extends PromotionDto {
  uiStatus: "vigente" | "expirado"
}

function toPromoView(p: PromotionDto): PromoView {
  return {
    ...p,
    uiStatus: p.status === "active" && !p.redeemed ? "vigente" : "expirado",
  }
}

// ── Component ─────────────────────────────────────────────────

export function PromosView() {
  // Notifications stay in the store (separate concern)
  const { notifications, markNotificationRead } = useStore()

  const [promos, setPromos] = useState<PromoView[]>([])
  const [loading, setLoading] = useState(true)
  const [redeemingId, setRedeemingId] = useState<string | null>(null)
  const [selectedPromo, setSelectedPromo] = useState<PromoView | null>(null)
  const [copiedCode, setCopiedCode] = useState(false)
  const [filterStatus, setFilterStatus] = useState<"all" | "vigente" | "expirado">("all")

  async function fetchPromos() {
    try {
      const res = await fetch("/api/client/promotions")
      if (res.ok) {
        const data = await res.json()
        setPromos((data.promotions ?? []).map(toPromoView))
      }
    } catch (err) {
      console.error("PromosView: error fetching promotions", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPromos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const vigentes = promos.filter((p) => p.uiStatus === "vigente")
  const expirados = promos.filter((p) => p.uiStatus === "expirado")
  const filtered =
    filterStatus === "all" ? promos : promos.filter((p) => p.uiStatus === filterStatus)

  const promoNotifications = useMemo(() => {
    return (notifications as Notification[])
      .filter((n) => n.type === "promo")
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [notifications])
  const unreadCount = promoNotifications.filter((n) => !n.read).length

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopiedCode(true)
    setTimeout(() => setCopiedCode(false), 2000)
  }

  async function handleRedeem(promo: PromoView) {
    if (redeemingId) return
    setRedeemingId(promo.id)
    try {
      const res = await fetch(`/api/client/promotions/${promo.id}/redeem`, {
        method: "POST",
      })
      if (res.ok) {
        setSelectedPromo(null)
        await fetchPromos()
      } else {
        const data = await res.json()
        console.error("PromosView: redeem error:", data.error)
      }
    } catch (err) {
      console.error("PromosView: redeem unexpected error", err)
    } finally {
      setRedeemingId(null)
    }
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
          {promoNotifications.length > 0 ? (
            promoNotifications.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => markNotificationRead(notif.id)}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  notif.read ? "bg-background" : "bg-primary/5 hover:bg-primary/10"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${notif.read ? "bg-muted" : "bg-primary"}`}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${notif.read ? "text-muted-foreground" : "text-foreground font-medium"}`}
                  >
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDateLong(notif.date)}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sin notificaciones de promos
            </p>
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
        {loading ? (
          <Card className="border border-border">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              Cargando promociones…
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="border border-dashed border-muted-foreground/20 bg-muted/30 shadow-none">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <Gift className="w-8 h-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">
                {filterStatus === "all"
                  ? "No hay promociones disponibles."
                  : filterStatus === "vigente"
                  ? "No hay promociones vigentes."
                  : "No tienes promociones usadas o expiradas."}
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((promo) => (
            <button
              key={promo.id}
              type="button"
              onClick={() => setSelectedPromo(promo)}
              className="text-left"
            >
              <Card
                className={`border transition-all duration-200 hover:shadow-md cursor-pointer ${
                  promo.uiStatus === "vigente"
                    ? "border-primary/20 hover:border-primary/40"
                    : "border-border opacity-70"
                }`}
              >
                <CardContent className="flex items-start gap-3 py-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                      promo.uiStatus === "vigente" ? "bg-primary/10" : "bg-muted"
                    }`}
                  >
                    <Gift
                      className={`w-5 h-5 ${
                        promo.uiStatus === "vigente" ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-semibold text-foreground">{promo.title}</h4>
                      <Badge
                        className={`border-0 text-xs ${
                          promo.uiStatus === "vigente"
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {promo.uiStatus === "vigente"
                          ? "Vigente"
                          : promo.redeemedAt
                          ? "Usada"
                          : "Expirada"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{promo.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {promo.uiStatus === "vigente"
                        ? `Valida hasta: ${formatDateLong(promo.expiresAt ?? "")}`
                        : promo.redeemedAt
                        ? `Usada el ${formatDateLong(promo.redeemedAt)}`
                        : `Expiro el ${formatDateLong(promo.expiresAt ?? "")}`}
                    </p>
                    {promo.code && promo.uiStatus === "vigente" && (
                      <Badge variant="secondary" className="mt-2 font-mono text-xs">
                        <Tag className="w-3 h-3 mr-1" />
                        {promo.code}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))
        )}
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
                    {selectedPromo.uiStatus === "vigente" && (
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

              {/* Status info */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estado:</span>
                <Badge
                  className={`border-0 ${
                    selectedPromo.uiStatus === "vigente"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {selectedPromo.uiStatus === "vigente"
                    ? "Vigente"
                    : selectedPromo.redeemedAt
                    ? "Usada"
                    : "Expirada"}
                </Badge>
              </div>
              {selectedPromo.expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Validez:</span>
                  <span className="font-medium text-foreground">
                    {formatDateLong(selectedPromo.expiresAt)}
                  </span>
                </div>
              )}

              {selectedPromo.uiStatus === "vigente" && (
                <Button
                  onClick={() => handleRedeem(selectedPromo)}
                  disabled={redeemingId === selectedPromo.id}
                  className="w-full"
                >
                  {redeemingId === selectedPromo.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
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
