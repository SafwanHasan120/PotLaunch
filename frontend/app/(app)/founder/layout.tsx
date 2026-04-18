import Link from 'next/link'

export default function FounderLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-1 text-sm text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-700">Dashboard</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium">Founder</span>
      </div>
      <div className="flex gap-6 mb-8">
        <NavTab href="/founder/campaigns" label="My Campaigns" />
        <NavTab href="/founder/pitches" label="Pitches Received" />
        <NavTab href="/founder/revenue" label="Revenue Oracle" />
      </div>
      {children}
    </div>
  )
}

function NavTab({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium text-gray-600 hover:text-gray-900 pb-1 border-b-2 border-transparent hover:border-emerald-500 transition-colors"
    >
      {label}
    </Link>
  )
}
