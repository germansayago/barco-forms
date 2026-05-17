import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/components/admin/LogoutButton'
import { LayoutDashboard } from 'lucide-react'
import Link from 'next/link'

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/admin/login')
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row bg-gray-50">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">BarcoForms</h2>
          <p className="text-sm text-gray-500 truncate mt-1">{user.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="flex items-center gap-3 px-3 py-2 rounded-md bg-gray-100 text-gray-900 hover:bg-gray-200 transition-colors">
            <LayoutDashboard className="h-5 w-5" />
            <span className="font-medium">Formularios</span>
          </Link>
          {/* Aquí irán más links en el futuro */}
        </nav>
        <div className="p-4 border-t border-gray-200">
          <LogoutButton />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
