import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'

const FEATURED_CAMPAIGNS = [
  {
    id: 'saba-roasters-1',
    title: 'Saba Roasters',
    sector: 'Food & Beverage',
    raised_amount_cents: 14500000,
    target_amount_cents: 20000000,
    profit_share_pct: 25,
    users: { full_name: 'Ahmed Y.' }
  },
  {
    id: 'nexus-analytics-2',
    title: 'Nexus Analytics',
    sector: 'Technology',
    raised_amount_cents: 85000000,
    target_amount_cents: 100000000,
    profit_share_pct: 15,
    users: { full_name: 'Sarah M.' }
  },
  {
    id: 'apex-fitness-3',
    title: 'Apex Fitness Hub',
    sector: 'Health & Wellness',
    raised_amount_cents: 3000000,
    target_amount_cents: 5000000,
    profit_share_pct: 35,
    users: { full_name: 'David L.' }
  }
];

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await createAdminClient()
    .from('users')
    .select('full_name, role')
    .eq('id', user!.id)
    .single()

  return (
    <div className="max-w-6xl mx-auto p-8 md:p-12 space-y-12">
      <div>
        <h1 className="text-4xl font-serif font-medium text-white">
          Hello, {profile?.full_name ?? 'Friend'}.
        </h1>
        <p className="text-lg text-white/60 mt-2 font-light">Welcome back to your Mudarabah investment dashboard.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SummaryCard title="Campaigns" description="Invest in Shariah-compliant startups via Mudaraba profit-sharing." href="/campaigns" />
        <SummaryCard title="Your Wallet" description="View your active balance and complete transaction history." href="/wallet" />
        <SummaryCard title="My Pitches" description="Track all investment proposals you have submitted to founders." href="/investor/pitches" />
        <SummaryCard title="My Contracts" description="View active and completed Mudarabah contracts and their event logs." href="/investor/contracts" />
      </div>

      <div className="pt-8 border-t border-white/10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-serif font-medium text-white mb-2">Live Opportunities</h2>
            <p className="text-white/60 font-light">Trending businesses currently raising capital.</p>
          </div>
          <Link href="/campaigns" className="text-sm text-white/60 font-medium hover:text-accent transition-colors pb-1 border-b border-transparent hover:border-accent">
            View all &rarr;
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_CAMPAIGNS.map((c) => {
            const pct = c.target_amount_cents > 0
              ? Math.min(100, Math.round((c.raised_amount_cents / c.target_amount_cents) * 100))
              : 0
            const format = (cents: number) =>
              new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
            return (
              <Link
                key={c.id}
                href={`/campaigns/${c.id}`}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-accent/40 hover:bg-white/8 hover:-translate-y-1 transition-all block group"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-medium text-white/50 uppercase tracking-widest">{c.sector}</span>
                  <span className="bg-white/10 text-white/70 text-xs font-semibold px-2 py-1 rounded-md border border-white/10">{c.users?.full_name}</span>
                </div>
                <h3 className="text-xl font-serif font-medium text-white mb-6 group-hover:text-accent transition-colors">{c.title}</h3>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between items-end">
                    <span className="text-2xl font-medium text-white">{format(c.raised_amount_cents)}</span>
                    <span className="text-xs text-white/50 font-medium">of {format(c.target_amount_cents)}</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-4">
                  <span className="text-sm text-white/50 font-light">Investor Share</span>
                  <span className="text-accent bg-accent/10 text-xs font-bold px-2 py-1 rounded-md border border-accent/20">{c.profit_share_pct}%</span>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link
      href={href}
      className="block p-8 bg-white/5 rounded-3xl border border-white/10 hover:border-accent/40 hover:bg-white/8 hover:-translate-y-1 transition-all group"
    >
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-2xl font-serif font-medium text-white group-hover:text-accent transition-colors">{title}</h3>
        <span className="text-accent bg-accent/10 px-3 py-1 rounded-full text-xs font-semibold tracking-wide border border-accent/20">
          Open &rarr;
        </span>
      </div>
      <p className="text-base text-white/60 font-light leading-relaxed">{description}</p>
    </Link>
  )
}
