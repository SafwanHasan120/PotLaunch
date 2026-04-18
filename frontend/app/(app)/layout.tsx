import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from './LogoutButton'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100">
          <span className="text-lg font-bold text-emerald-700">PotLaunch</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/dashboard" label="Dashboard" />
          <NavLink href="/wallet" label="Wallet" />

          <div className="pt-3 pb-1 px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Campaigns</p>
          </div>
          <NavLink href="/campaigns" label="Browse Campaigns" />
          <NavLink href="/campaigns/new" label="Launch a Campaign" />

          <div className="pt-3 pb-1 px-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">My Activity</p>
          </div>
          <NavLink href="/founder/campaigns" label="My Campaigns" />
          <NavLink href="/investor/pitches" label="My Pitches" />
          <NavLink href="/investor/contracts" label="My Contracts" />
          <NavLink href="/founder/revenue" label="Revenue Oracle" />
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 space-y-1">
          <LogoutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
    >
      {label}
    </Link>
  )
}
