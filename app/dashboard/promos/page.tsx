import { PageHeader } from "@/components/page-header"
import { PromosView } from "@/components/promos-view"
import { Gift } from "lucide-react"

export default function PromosPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Promos y Beneficios"
        description="Aprovecha descuentos y beneficios exclusivos del gym"
        icon={Gift}
      />
      <PromosView />
    </div>
  )
}
