import { use } from "react"
import { TrainerClientDetail } from "@/components/trainer/trainer-client-detail"

export default function TrainerClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = use(params)
  return <TrainerClientDetail clientId={clientId} />
}

