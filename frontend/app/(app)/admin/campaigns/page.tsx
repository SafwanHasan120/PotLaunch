'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

type Campaign = {
  id: string
  title: string
  sector: string
  business_type: string
  target_amount_cents: number
  profit_share_pct: number
  duration_months: number
  status: string
  created_at: string
  users: { id: string; full_name: string; barakah_score: number | null } | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_BADGE: Record<string, string> = {
  pending_review: 'bg-amber-500/20 text-amber-400',
  live:           'bg-emerald-500/20 text-emerald-400',
  funded:         'bg-blue-500/20 text-blue-400',
  in_progress:    'bg-violet-500/20 text-violet-400',
  completed:      'bg-white/10 text-white/40',
  failed:         'bg-red-500/20 text-red-400',
  draft:          'bg-white/10 text-white/30',
}

const STATUS_TABS = ['pending_review', 'live', 'funded', 'in_progress', 'completed', 'failed', 'all']

function ReviewModal({ campaign, onClose, onDone }: {
  campaign: Campaign
  onClose: () => void
  onDone: (id: string, newStatus: string) => void
}) {
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  async function act(action: 'approve' | 'reject') {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, review_notes: notes || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        onDone(campaign.id, data.status)
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-brand border border-white/10 rounded-2xl shadow-xl w-full max-w-lg space-y-5 p-6">
        <div>
          <h2 className="text-lg font-semibold text-white">Review campaign</h2>
          <p className="text-sm text-white/50 mt-0.5">{campaign.title}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-white/40">Founder</p>
            <p className="font-medium text-white">{campaign.users?.full_name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Sector</p>
            <p className="font-medium text-white capitalize">{campaign.sector}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Target</p>
            <p className="font-medium text-white">{formatUSD(campaign.target_amount_cents)}</p>
          </div>
          <div>
            <p className="text-xs text-white/40">Profit share / Duration</p>
            <p className="font-medium text-white">{campaign.profit_share_pct}% · {campaign.duration_months}mo</p>
          </div>
          {campaign.users?.barakah_score != null && (
            <div>
              <p className="text-xs text-white/40">Barakah Score</p>
              <p className="font-medium text-accent">★ {campaign.users.barakah_score.toFixed(1)}</p>
            </div>
          )}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-white/80">Review notes (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for approval or rejection…"
            className="w-full px-3 py-2 border border-white/20 rounded-lg text-sm bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:bg-white/5">
            Cancel
          </button>
          <button
            onClick={() => act('reject')}
            disabled={loading}
            className="text-sm px-4 py-2 rounded-lg bg-white/5 border border-red-500/30 text-red-400 hover:bg-red-500/10 disabled:opacity-60"
          >
            Reject
          </button>
          <button
            onClick={() => act('approve')}
            disabled={loading}
            className="text-sm px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-brand font-medium disabled:opacity-60"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [activeTab, setActiveTab] = useState('pending_review')
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [reviewing, setReviewing] = useState<Campaign | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/campaigns?status=${activeTab}&page=${page}`)
    if (res.ok) {
      const data = await res.json()
      setCampaigns(data.campaigns)
      setTotal(data.total)
    }
    setLoading(false)
  }, [activeTab, page])

  useEffect(() => { load() }, [load])
  useEffect(() => { setPage(1) }, [activeTab])

  function handleDone(id: string, newStatus: string) {
    setCampaigns((prev) => prev.map((c) => c.id === id ? { ...c, status: newStatus } : c))
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Campaign review</h1>
        <p className="text-sm text-white/50 mt-1">Approve or reject campaign submissions across all statuses.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors capitalize ${
              activeTab === tab
                ? 'bg-white/20 text-white'
                : 'bg-white/5 text-white/50 hover:bg-white/10'
            }`}
          >
            {tab.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map((i) => <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-10 text-center">
          <p className="text-sm text-white/50">No campaigns with status &ldquo;{activeTab.replace(/_/g, ' ')}&rdquo;.</p>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/10">
          {campaigns.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link href={`/campaigns/${c.id}`} className="text-sm font-semibold text-white hover:text-accent truncate">
                    {c.title}
                  </Link>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ${STATUS_BADGE[c.status] ?? 'bg-white/10 text-white/40'}`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-white/30 capitalize shrink-0">{c.business_type}</span>
                </div>
                <p className="text-xs text-white/40 mt-0.5">
                  {c.users?.full_name} · {c.sector} · {formatUSD(c.target_amount_cents)} target · {new Date(c.created_at).toLocaleDateString()}
                </p>
              </div>
              {c.status === 'pending_review' && (
                <button
                  onClick={() => setReviewing(c)}
                  className="text-xs bg-accent hover:bg-accent-hover text-brand font-medium px-3 py-1.5 rounded-lg shrink-0"
                >
                  Review
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/5 disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-white/40 self-center">Page {page}</span>
          <button
            disabled={page * 20 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/20 text-white/60 hover:bg-white/5 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {reviewing && (
        <ReviewModal campaign={reviewing} onClose={() => setReviewing(null)} onDone={handleDone} />
      )}
    </div>
  )
}
