'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'saba-roasters-1',
    title: 'Saba Roasters',
    slug: 'saba-roasters',
    description: 'A premium authentic Yemeni coffee house expanding to a second flagship location.',
    sector: 'Food & Beverage',
    business_type: 'local',
    target_amount_cents: 20000000,
    raised_amount_cents: 14500000,
    min_investment_cents: 50000,
    profit_share_pct: 25,
    duration_months: 36,
    status: 'live',
    users: { full_name: 'Ahmed Y.', barakah_score: 4.8 }
  },
  {
    id: 'nexus-analytics-2',
    title: 'Nexus Analytics',
    slug: 'nexus-analytics',
    description: 'An enterprise B2B data visualization platform for small e-commerce retailers.',
    sector: 'Technology',
    business_type: 'startup',
    target_amount_cents: 100000000,
    raised_amount_cents: 85000000,
    min_investment_cents: 100000,
    profit_share_pct: 15,
    duration_months: 48,
    status: 'live',
    users: { full_name: 'Sarah M.', barakah_score: 4.9 }
  },
  {
    id: 'apex-fitness-3',
    title: 'Apex Fitness Hub',
    slug: 'apex-fitness',
    description: 'A local neighborhood wellness center and gym expanding its functional training area.',
    sector: 'Healthcare',
    business_type: 'local',
    target_amount_cents: 5000000,
    raised_amount_cents: 3000000,
    min_investment_cents: 10000,
    profit_share_pct: 35,
    duration_months: 24,
    status: 'live',
    users: { full_name: 'David L.', barakah_score: 4.5 }
  },
  {
    id: 'mochas-dates-4',
    title: 'Mochas & Dates',
    slug: 'mochas-dates',
    description: 'Scaling a regional distribution network for organic Medjool dates and authentic treats.',
    sector: 'Retail',
    business_type: 'local',
    target_amount_cents: 15000000,
    raised_amount_cents: 2500000,
    min_investment_cents: 100000,
    profit_share_pct: 20,
    duration_months: 60,
    status: 'live',
    users: { full_name: 'Omar Z.', barakah_score: 4.6 }
  },
  {
    id: 'urban-bolt-5',
    title: 'Urban Bolt Logistics',
    slug: 'urban-bolt',
    description: 'Zero-emission last-mile delivery fleet catering to local downtown retailers.',
    sector: 'Services',
    business_type: 'startup',
    target_amount_cents: 50000000,
    raised_amount_cents: 48000000,
    min_investment_cents: 500000,
    profit_share_pct: 18,
    duration_months: 36,
    status: 'live',
    users: { full_name: 'Marcus T.', barakah_score: 4.7 }
  },
]

const SECTORS = ['Technology', 'Food & Beverage', 'Retail', 'Healthcare', 'Education', 'Real Estate', 'Manufacturing', 'Services']
const STATUSES = [
  { value: 'live', label: 'Fundraising' },
  { value: 'funded', label: 'Funded' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]
const BUSINESS_TYPES = [
  { value: '', label: 'All types' },
  { value: 'startup', label: 'Startup' },
  { value: 'local', label: 'Local Business' },
]

type Campaign = {
  id: string
  title: string
  slug: string
  description: string
  sector: string
  business_type: string
  target_amount_cents: number
  raised_amount_cents: number
  min_investment_cents: number
  profit_share_pct: number
  duration_months: number
  status: string
  users: { full_name: string; barakah_score?: number | null } | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function ProgressBar({ raisedCents, targetCents }: { raisedCents: number; targetCents: number }) {
  const pct = targetCents > 0 ? Math.min(100, Math.round((raisedCents / targetCents) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-white/50 mb-1">
        <span>{formatUSD(raisedCents)} raised</span>
        <span>{pct}%</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-white/40 mt-1">Goal: {formatUSD(targetCents)}</p>
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  live: 'bg-emerald-500/20 text-emerald-400',
  funded: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  completed: 'bg-white/10 text-white/50',
}

const STATUS_LABEL: Record<string, string> = {
  live: 'Fundraising',
  funded: 'Funded',
  in_progress: 'In Progress',
  completed: 'Completed',
}

function CampaignCard({ campaign }: { campaign: Campaign }) {
  return (
    <Link
      href={`/campaigns/${campaign.id}`}
      className="block bg-white/5 border border-white/10 rounded-xl p-5 hover:border-accent/40 hover:bg-white/8 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[campaign.status] ?? 'bg-white/10 text-white/50'}`}>
              {STATUS_LABEL[campaign.status] ?? campaign.status}
            </span>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${campaign.business_type === 'local' ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'}`}>
              {campaign.business_type === 'local' ? 'Local' : 'Startup'}
            </span>
          </div>
          <h3 className="font-semibold text-white text-sm leading-snug truncate">{campaign.title}</h3>
          <p className="text-xs text-white/50 mt-0.5">
            {campaign.users?.full_name ?? 'Unknown founder'}
            {campaign.users?.barakah_score != null && (
              <span className="ml-1.5 text-amber-400 font-medium">★ {(campaign.users.barakah_score as number).toFixed(1)}</span>
            )}
            {' '}· {campaign.sector}
          </p>
        </div>
      </div>

      <p className="text-xs text-white/50 line-clamp-2 mb-4">{campaign.description}</p>

      <ProgressBar raisedCents={campaign.raised_amount_cents} targetCents={campaign.target_amount_cents} />

      <div className="flex gap-4 mt-4 pt-4 border-t border-white/10 text-xs text-white/40">
        <div>
          <span className="block font-medium text-white">{campaign.profit_share_pct}%</span>
          <span>Investor share</span>
        </div>
        <div>
          <span className="block font-medium text-white">{formatUSD(campaign.min_investment_cents)}</span>
          <span>Min. invest</span>
        </div>
        <div>
          <span className="block font-medium text-white">{campaign.duration_months}mo</span>
          <span>Duration</span>
        </div>
      </div>
    </Link>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('live')
  const [sector, setSector] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = useCallback(async (p: number, s: string, sec: string, bt: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: s, page: String(p) })
      if (sec) params.set('sector', sec)
      if (bt) params.set('business_type', bt)
      const res = await fetch(`/api/campaigns?${params}`)
      const data = await res.json()
      const apiCampaigns: Campaign[] = data.campaigns ?? []

      // Filter mock campaigns by active filters, excluding any whose id matches a real campaign
      const apiIds = new Set(apiCampaigns.map((c) => c.id))
      let filtered = MOCK_CAMPAIGNS.filter((c) => !apiIds.has(c.id))
      if (s && s !== 'all') filtered = filtered.filter((c) => c.status === s)
      if (sec) filtered = filtered.filter((c) => c.sector === sec)
      if (bt) filtered = filtered.filter((c) => c.business_type === bt)

      const merged = [...apiCampaigns, ...filtered]
      setCampaigns(merged)
      setTotal((data.total ?? 0) + filtered.length)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns(page, status, sector, businessType)
  }, [page, status, sector, businessType, fetchCampaigns])

  function handleStatusChange(s: string) { setStatus(s); setPage(1) }
  function handleSectorChange(sec: string) { setSector(sec); setPage(1) }
  function handleBusinessTypeChange(bt: string) { setBusinessType(bt); setPage(1) }

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Campaigns</h1>
          <p className="text-sm text-white/60 mt-1">Invest in Mudaraba-compliant businesses and share in their growth.</p>
        </div>
        <Link
          href="/campaigns/new"
          className="text-sm bg-accent hover:bg-accent-hover text-brand font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Launch a campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                status === s.value ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={sector}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="text-xs border border-white/20 rounded-lg px-3 py-1.5 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-brand"
        >
          <option value="">All sectors</option>
          {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={businessType}
          onChange={(e) => handleBusinessTypeChange(e.target.value)}
          className="text-xs border border-white/20 rounded-lg px-3 py-1.5 bg-white/5 text-white focus:outline-none focus:ring-1 focus:ring-accent [&>option]:bg-brand"
        >
          {BUSINESS_TYPES.map((bt) => <option key={bt.value} value={bt.value}>{bt.label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/5 rounded-xl h-52 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-white/50">
          <p className="text-lg font-medium">No campaigns found</p>
          <p className="text-sm mt-1">Try a different filter or be the first to launch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => <CampaignCard key={c.id} campaign={c} />)}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-white/20 rounded-lg disabled:opacity-40 hover:bg-white/5 text-white/70 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-white/50">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-white/20 rounded-lg disabled:opacity-40 hover:bg-white/5 text-white/70 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
