'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  sector: string
  business_type: string
  target_amount_cents: number
  raised_amount_cents: number
  min_investment_cents: number
  profit_share_pct: number
  duration_months: number
  status: string
  created_at: string
  review_notes: string | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_BADGE: Record<string, string> = {
  draft:            'bg-white/10 text-white/40',
  pending_review:   'bg-amber-500/20 text-amber-400',
  live:             'bg-emerald-500/20 text-emerald-400',
  funded:           'bg-blue-500/20 text-blue-400',
  in_progress:      'bg-violet-500/20 text-violet-400',
  profit_reporting: 'bg-purple-500/20 text-purple-400',
  completed:        'bg-white/10 text-white/40',
  failed:           'bg-red-500/20 text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  draft:            'Draft',
  pending_review:   'Pending Review',
  live:             'Fundraising',
  funded:           'Funded',
  in_progress:      'In Progress',
  profit_reporting: 'Profit Reporting',
  completed:        'Completed',
  failed:           'Failed / Rejected',
}

export default function FounderCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/founder/campaigns')
        const data = await res.json()
        if (!res.ok) { setError(data.error ?? 'Failed to load'); return }
        setCampaigns(data.campaigns)
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="p-8 space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
    </div>
  )

  if (error) return <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg m-8">{error}</p>

  if (campaigns.length === 0) return (
    <div className="text-center py-16 text-white/50 p-8">
      <p className="text-lg font-medium text-white">No campaigns yet</p>
      <p className="text-sm mt-1">Ready to raise capital?</p>
      <Link href="/campaigns/new" className="inline-block mt-4 bg-accent hover:bg-accent-hover text-brand text-sm font-medium px-4 py-2 rounded-lg">
        Launch a campaign
      </Link>
    </div>
  )

  return (
    <div className="p-8 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        <Link href="/campaigns/new" className="text-sm bg-accent hover:bg-accent-hover text-brand font-medium px-3 py-1.5 rounded-lg">
          + New campaign
        </Link>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/10">
        {campaigns.map((c) => {
          const pct = c.target_amount_cents > 0
            ? Math.min(100, Math.round((c.raised_amount_cents / c.target_amount_cents) * 100))
            : 0
          return (
            <div key={c.id} className="px-5 py-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] ?? 'bg-white/10 text-white/40'}`}>
                      {STATUS_LABEL[c.status] ?? c.status}
                    </span>
                    <span className="text-xs text-white/30 capitalize">{c.business_type} · {c.sector}</span>
                  </div>
                  <p className="text-sm font-semibold text-white">{c.title}</p>
                  {c.review_notes && c.status === 'failed' && (
                    <p className="text-xs text-red-400 mt-1">Note: {c.review_notes}</p>
                  )}
                </div>
                <Link href={`/campaigns/${c.id}`} className="text-xs text-accent hover:underline shrink-0 font-medium">
                  View →
                </Link>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs text-white/40">
                  <span>{formatUSD(c.raised_amount_cents)} raised</span>
                  <span>{pct}% of {formatUSD(c.target_amount_cents)}</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>

              <div className="flex gap-4 text-xs text-white/40">
                <span><strong className="text-white">{c.profit_share_pct}%</strong> investor share</span>
                <span><strong className="text-white">{c.duration_months}mo</strong> duration</span>
                <span><strong className="text-white">{formatUSD(c.min_investment_cents)}</strong> min invest</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
