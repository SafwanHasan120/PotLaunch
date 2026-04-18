'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  description: string
  sector: string
  business_type: string
  target_amount_cents: number
  raised_amount_cents: number
  min_investment_cents: number
  profit_share_pct: number
  profit_interval: string
  duration_months: number
  status: string
  business_plan_url: string | null
  review_notes: string | null
  funded_at: string | null
  founder_id: string
  progress_pct: number
  investor_count: number
  users: { full_name: string; barakah_score?: number | null } | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_BADGE: Record<string, string> = {
  live: 'bg-emerald-500/20 text-emerald-400',
  funded: 'bg-blue-500/20 text-blue-400',
  in_progress: 'bg-amber-500/20 text-amber-400',
  profit_reporting: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-white/10 text-white/50',
  failed: 'bg-red-500/20 text-red-400',
}

const STATUS_LABEL: Record<string, string> = {
  live: 'Fundraising',
  funded: 'Funded',
  in_progress: 'In Progress',
  profit_reporting: 'Profit Reporting',
  completed: 'Completed',
  failed: 'Failed',
}

const INTERVAL_LABEL: Record<string, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  milestone: 'Per Milestone',
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-xs text-white/50 mb-1">{label}</p>
      <p className="text-lg font-semibold text-white">{value}</p>
    </div>
  )
}

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/campaigns/${id}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error ?? 'Campaign not found')
          return
        }
        setCampaign(await res.json())
      } catch {
        setError('Failed to load campaign')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-4">
        <div className="h-8 bg-white/5 rounded animate-pulse w-2/3" />
        <div className="h-4 bg-white/5 rounded animate-pulse w-1/3" />
        <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-lg text-sm">{error ?? 'Campaign not found'}</p>
        <Link href="/campaigns" className="text-sm text-accent hover:underline mt-4 inline-block">← Back to campaigns</Link>
      </div>
    )
  }

  const progressPct = campaign.progress_pct

  return (
    <div className="p-8 max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <Link href="/campaigns" className="text-sm text-white/50 hover:text-white">← Back to campaigns</Link>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[campaign.status] ?? 'bg-white/10 text-white/50'}`}>
                {STATUS_LABEL[campaign.status] ?? campaign.status}
              </span>
              <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${campaign.business_type === 'local' ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-400'}`}>
                {campaign.business_type === 'local' ? 'Local Business' : 'Startup / Corporate'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-white">{campaign.title}</h1>
            <p className="text-sm text-white/50 mt-1">
              {campaign.users?.full_name ?? 'Unknown founder'}
              {campaign.users?.barakah_score != null && (
                <span className="ml-2 text-amber-400 font-medium text-xs">★ {(campaign.users.barakah_score as number).toFixed(1)} Barakah</span>
              )}
              {' '}· {campaign.sector}
            </p>
          </div>
        </div>
      </div>

      {/* Funding progress */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-3">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-white">{formatUSD(campaign.raised_amount_cents)} raised</span>
          <span className="text-white/50">{progressPct}% of {formatUSD(campaign.target_amount_cents)}</span>
        </div>
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="flex gap-6 text-xs text-white/40 pt-1">
          <span><strong className="text-white">{campaign.investor_count}</strong> investors</span>
          {campaign.funded_at && (
            <span>Funded {new Date(campaign.funded_at).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Investor profit share" value={`${campaign.profit_share_pct}%`} />
        <Stat label="Min. investment" value={formatUSD(campaign.min_investment_cents)} />
        <Stat label="Campaign duration" value={`${campaign.duration_months} months`} />
        <Stat label="Profit reporting" value={INTERVAL_LABEL[campaign.profit_interval] ?? campaign.profit_interval} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-white">About this campaign</h2>
        <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
      </div>

      {/* Business plan */}
      {campaign.business_plan_url && (
        <div className="border border-white/10 bg-white/5 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white">Business Plan</p>
            <p className="text-xs text-white/40 mt-0.5">Review the full plan before investing</p>
          </div>
          <a
            href={campaign.business_plan_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-accent hover:underline font-medium"
          >
            Download PDF →
          </a>
        </div>
      )}

      {/* Invest CTA */}
      {campaign.status === 'live' && (
        <div className="bg-accent/10 border border-accent/20 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-white">Participate in this campaign</h2>
          <p className="text-sm text-white/70">
            Minimum investment is <strong className="text-white">{formatUSD(campaign.min_investment_cents)}</strong>.
            Investors receive <strong className="text-white">{campaign.profit_share_pct}%</strong> of gross profits, shared proportionally.
            A Wakalah service fee applies on profit distributions.
          </p>
          <p className="text-xs text-white/40">
            Under Mudarabah principles you bear the risk of business loss. Returns are not guaranteed.
          </p>
          <div className="flex gap-3 flex-wrap">
            <Link
              href={`/campaigns/${campaign.id}/pitch`}
              className="inline-block bg-accent hover:bg-accent-hover text-brand font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Submit a pitch
            </Link>
            <Link
              href={`/campaigns/${campaign.id}/invest`}
              className="inline-block bg-white/10 hover:bg-white/20 text-white border border-white/20 font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
            >
              Invest directly
            </Link>
          </div>
        </div>
      )}

      {campaign.status === 'funded' && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-sm text-blue-400">
          This campaign has reached its funding target and is awaiting launch.
        </div>
      )}
      {campaign.status === 'completed' && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white/60">
          This campaign has completed and all profits have been distributed.
        </div>
      )}
      {campaign.status === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-sm text-red-400">
          This campaign did not succeed. Investors have been refunded.
        </div>
      )}
    </div>
  )
}
