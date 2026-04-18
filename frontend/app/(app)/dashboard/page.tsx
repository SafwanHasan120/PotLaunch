import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Assalamu Alaikum, {profile?.full_name ?? 'Friend'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Welcome to AmanahOS — your ethical finance dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SummaryCard
          title="Campaigns"
          description="Invest in Shariah-compliant startups via Mudaraba profit-sharing."
          href="/campaigns"
          color="emerald"
        />
        <SummaryCard
          title="Your Wallet"
          description="View your balance and transaction history."
          href="/wallet"
          color="violet"
        />
      </div>
    </div>
  )
}

function SummaryCard({
  title,
  description,
  href,
  color,
}: {
  title: string
  description: string
  href: string
  color: 'emerald' | 'blue' | 'violet'
}) {
  const ring = {
    emerald: 'border-emerald-200 hover:border-emerald-400',
    blue: 'border-blue-200 hover:border-blue-400',
    violet: 'border-violet-200 hover:border-violet-400',
  }[color]

  const badge = {
    emerald: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
  }[color]

  return (
    <a
      href={href}
      className={`block p-5 bg-white rounded-xl border-2 ${ring} transition-colors space-y-2`}
    >
      <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${badge}`}>
        {title}
      </span>
      <p className="text-sm text-gray-600">{description}</p>
    </a>
  )
}
