import { PageHeader } from "@/components/page-header"
import { ProfileView } from "@/components/profile-view"
import { User } from "lucide-react"

export default function ProfilePage() {
  return (
    <div className="px-4 py-6 lg:px-8 lg:py-8">
      <PageHeader
        title="Mi Perfil"
        description="Administra tu cuenta y preferencias"
        icon={User}
      />
      <ProfileView />
    </div>
  )
}
