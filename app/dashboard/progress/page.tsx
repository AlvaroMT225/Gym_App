import { PageHeader } from "@/components/page-header"
import { ProgressView } from "@/components/progress-view"
import { TrendingUp } from "lucide-react"

export default function ProgressPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Progreso"
        description="Visualiza tus PRs, volumen, consistencia y tendencias"
        icon={TrendingUp}
      />
      <ProgressView />
    </div>
  )
}
