import { PageHeader } from "@/components/page-header"
import { AchievementsView } from "@/components/achievements-view"
import { Award } from "lucide-react"

export default function AchievementsPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Logros e Insignias"
        description="Desbloquea logros y gana insignias con tu esfuerzo"
        icon={Award}
      />
      <AchievementsView />
    </div>
  )
}
