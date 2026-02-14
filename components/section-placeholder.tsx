import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface SectionPlaceholderProps {
  icon: LucideIcon
  title: string
  description: string
  phase: string
}

export function SectionPlaceholder({ icon: Icon, title, description, phase }: SectionPlaceholderProps) {
  return (
    <Card className="border border-dashed border-primary/30 bg-primary/5 shadow-none">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-5">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-4 leading-relaxed">{description}</p>
        <span className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
          {phase}
        </span>
      </CardContent>
    </Card>
  )
}
