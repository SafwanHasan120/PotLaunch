'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const SECTORS = ['Technology', 'Food & Beverage', 'Retail', 'Healthcare', 'Education', 'Real Estate', 'Manufacturing', 'Services']
const STATUSES = [
  { value: 'live', label: 'Fundraising' },
  { value: 'funded', label: 'Funded' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
]

type Campaign = {
  id: string
  title: string
  slug: string
  description: string
  sector: string
  target_amount_cents: number
  raised_amount_cents: number
  min_investment_cents: number
  profit_share_pct: number
  duration_months: number
  status: string
  users: { full_name: string } | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

function ProgressBar({ raisedCents, targetCents }: { raisedCents: number; targetCents: number }) {
  const pct = targetCents > 0 ? Math.min(100, Math.round((raisedCents / targetCents) * 100)) : 0
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{formatUSD(raisedCents)} raised</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-1">Goal: {formatUSD(targetCents)}</p>
    </div>
  )
}

const STATUS_BADGE: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700',
  funded: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
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
      className="block bg-white border border-gray-200 rounded-xl p-5 hover:border-emerald-400 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${STATUS_BADGE[campaign.status] ?? 'bg-gray-100 text-gray-600'}`}>
            {STATUS_LABEL[campaign.status] ?? campaign.status}
          </span>
          <h3 className="font-semibold text-gray-900 text-sm leading-snug truncate">{campaign.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{campaign.users?.full_name ?? 'Unknown founder'} · {campaign.sector}</p>
        </div>
      </div>

      <p className="text-xs text-gray-600 line-clamp-2 mb-4">{campaign.description}</p>

      <ProgressBar raisedCents={campaign.raised_amount_cents} targetCents={campaign.target_amount_cents} />

      <div className="flex gap-4 mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
        <div>
          <span className="block font-medium text-gray-800">{campaign.profit_share_pct}%</span>
          <span>Investor share</span>
        </div>
        <div>
          <span className="block font-medium text-gray-800">{formatUSD(campaign.min_investment_cents)}</span>
          <span>Min. invest</span>
        </div>
        <div>
          <span className="block font-medium text-gray-800">{campaign.duration_months}mo</span>
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
  const [loading, setLoading] = useState(true)

  const fetchCampaigns = useCallback(async (p: number, s: string, sec: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: s, page: String(p) })
      if (sec) params.set('sector', sec)
      const res = await fetch(`/api/campaigns?${params}`)
      const data = await res.json()
      setCampaigns(data.campaigns ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns(page, status, sector)
  }, [page, status, sector, fetchCampaigns])

  function handleStatusChange(s: string) {
    setStatus(s)
    setPage(1)
  }

  function handleSectorChange(sec: string) {
    setSector(sec)
    setPage(1)
  }

  const totalPages = Math.ceil(total / 12)

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Invest in Mudaraba-compliant businesses and share in their growth.</p>
        </div>
        <Link
          href="/campaigns/new"
          className="text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Launch a campaign
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => handleStatusChange(s.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                status === s.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <select
          value={sector}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All sectors</option>
          {SECTORS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-52 animate-pulse" />
          ))}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg font-medium">No campaigns found</p>
          <p className="text-sm mt-1">Try a different filter or be the first to launch.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
