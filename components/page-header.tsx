import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description: string
  icon: LucideIcon
}

export function PageHeader({ title, description, icon: Icon }: PageHeaderProps) {
  return (
    <div className="flex items-center gap-4 mb-8">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground text-balance">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
