import { PageHeader } from "@/components/page-header"
import { PaymentsView } from "@/components/payments-view"
import { CreditCard } from "lucide-react"

export default function PaymentsPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Pagos y Recordatorios"
        description="Consulta tu plan, historial de pagos y avisos de vencimiento"
        icon={CreditCard}
      />
      <PaymentsView />
    </div>
  )
}
