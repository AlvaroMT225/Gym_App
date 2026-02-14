import { PageHeader } from "@/components/page-header"
import { TutorialsView } from "@/components/tutorials-view"
import { BookOpen } from "lucide-react"

export default function TutorialsPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Tutoriales y Seguridad"
        description="Aprende la tecnica correcta y las normas de seguridad de cada maquina"
        icon={BookOpen}
      />
      <TutorialsView />
    </div>
  )
}
