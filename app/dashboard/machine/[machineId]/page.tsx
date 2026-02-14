import { MachinePanel } from "@/components/machine-panel"

interface MachinePageProps {
  params: Promise<{ machineId: string }>
}

export default async function MachinePage({ params }: MachinePageProps) {
  const { machineId } = await params
  return <MachinePanel machineId={machineId} />
}
