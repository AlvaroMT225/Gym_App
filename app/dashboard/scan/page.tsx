import { PageHeader } from "@/components/page-header"
import { ScanLine } from "lucide-react"
import { ScanContent } from "@/components/scan-content"

export default function ScanPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Escanear Maquina"
        description="Escanea el QR de la maquina para iniciar tu sesion express"
        icon={ScanLine}
      />
      <ScanContent />
    </div>
  )
}
