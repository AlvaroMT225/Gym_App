import { PageHeader } from "@/components/page-header"
import { ChallengesView } from "@/components/challenges-view"
import { Swords } from "lucide-react"

export default function ChallengesPage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Retos & Rankings"
        description="Compite en retos y sube en el ranking del gym"
        icon={Swords}
      />
      <ChallengesView />
    </div>
  )
}
