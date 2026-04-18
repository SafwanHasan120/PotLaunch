'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  description: string
  sector: string
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
  users: { full_name: string } | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_BADGE: Record<string, string> = {
  live: 'bg-emerald-100 text-emerald-700',
  funded: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  profit_reporting: 'bg-purple-100 text-purple-700',
  completed: 'bg-gray-100 text-gray-600',
  failed: 'bg-red-100 text-red-700',
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
  milestone: 'Per Milestone',
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
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
        <div className="h-8 bg-gray-100 rounded animate-pulse w-2/3" />
        <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
        <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    )
  }

  if (error || !campaign) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-red-600 bg-red-50 px-4 py-3 rounded-lg text-sm">{error ?? 'Campaign not found'}</p>
        <Link href="/campaigns" className="text-sm text-emerald-600 hover:underline mt-4 inline-block">← Back to campaigns</Link>
      </div>
    )
  }

  const progressPct = campaign.progress_pct

  return (
    <div className="p-8 max-w-3xl space-y-8">
      {/* Header */}
      <div>
        <Link href="/campaigns" className="text-sm text-gray-500 hover:text-gray-700">← Back to campaigns</Link>
        <div className="flex items-start justify-between gap-4 mt-3">
          <div>
            <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ${STATUS_BADGE[campaign.status] ?? 'bg-gray-100 text-gray-600'}`}>
              {STATUS_LABEL[campaign.status] ?? campaign.status}
            </span>
            <h1 className="text-2xl font-semibold text-gray-900">{campaign.title}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {campaign.users?.full_name ?? 'Unknown founder'} · {campaign.sector}
            </p>
          </div>
        </div>
      </div>

      {/* Funding progress */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <div className="flex justify-between text-sm font-medium">
          <span className="text-gray-900">{formatUSD(campaign.raised_amount_cents)} raised</span>
          <span className="text-gray-500">{progressPct}% of {formatUSD(campaign.target_amount_cents)}</span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex gap-6 text-xs text-gray-500 pt-1">
          <span><strong className="text-gray-800">{campaign.investor_count}</strong> investors</span>
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
        <h2 className="text-base font-semibold text-gray-900">About this campaign</h2>
        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
      </div>

      {/* Business plan */}
      {campaign.business_plan_url && (
        <div className="border border-gray-200 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Business Plan</p>
            <p className="text-xs text-gray-500 mt-0.5">Review the full plan before investing</p>
          </div>
          <a
            href={campaign.business_plan_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-emerald-600 hover:underline font-medium"
          >
            Download PDF →
          </a>
        </div>
      )}

      {/* Invest CTA */}
      {campaign.status === 'live' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Invest in this campaign</h2>
          <p className="text-sm text-gray-600">
            Minimum investment is <strong>{formatUSD(campaign.min_investment_cents)}</strong>.
            You will receive <strong>{campaign.profit_share_pct}%</strong> of reported gross profits proportional to your share.
          </p>
          <p className="text-xs text-gray-500">
            Under Mudaraba principles you bear the risk of business loss. Returns are not guaranteed.
          </p>
          <Link
            href={`/campaigns/${campaign.id}/invest`}
            className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors"
          >
            Invest now
          </Link>
        </div>
      )}

      {/* Non-live states */}
      {campaign.status === 'funded' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          This campaign has reached its funding target and is awaiting launch.
        </div>
      )}
      {campaign.status === 'completed' && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-600">
          This campaign has completed and all profits have been distributed.
        </div>
      )}
      {campaign.status === 'failed' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          This campaign did not succeed. Investors have been refunded.
        </div>
      )}
    </div>
  )
}
