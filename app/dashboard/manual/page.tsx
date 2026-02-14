import { PageHeader } from "@/components/page-header"
import { ManualRegister } from "@/components/manual-register"
import { ClipboardList } from "lucide-react"

export default function ManualPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Registro Manual"
        description="Registra tu entrenamiento manualmente seleccionando la maquina"
        icon={ClipboardList}
      />
      <ManualRegister />
    </div>
  )
}
