'use client'

import { useState, useEffect } from 'react'

type Pitch = {
  id: string
  proposed_amount_cents: number
  proposed_profit_share_pct: number
  message: string | null
  status: string
  created_at: string
  campaign_id: string
  users: { full_name: string } | null
}

type CampaignWithPitches = {
  id: string
  title: string
  pitches: Pitch[]
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_BADGE: Record<string, string> = {
  submitted:    'bg-blue-500/20 text-blue-400',
  under_review: 'bg-amber-500/20 text-amber-400',
  accepted:     'bg-emerald-500/20 text-emerald-400',
  rejected:     'bg-red-500/20 text-red-400',
  withdrawn:    'bg-white/10 text-white/40',
}

function PitchRow({ pitch, campaignId, onUpdate }: { pitch: Pitch; campaignId: string; onUpdate: (id: string, status: string) => void }) {
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  async function act(action: 'accept' | 'reject') {
    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/pitches/${pitch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, response: response || undefined }),
      })
      if (res.ok) onUpdate(pitch.id, action === 'accept' ? 'under_review' : 'rejected')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white">{pitch.users?.full_name ?? 'Unknown investor'}</p>
          <p className="text-xs text-white/50 mt-0.5">
            {formatUSD(pitch.proposed_amount_cents)} · {pitch.proposed_profit_share_pct}% investor share proposed
          </p>
          <p className="text-xs text-white/30 mt-0.5">{new Date(pitch.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[pitch.status] ?? 'bg-white/10 text-white/40'}`}>
          {pitch.status.replace('_', ' ')}
        </span>
      </div>

      {pitch.message && (
        <p className="text-xs text-white/40 italic border-l-2 border-white/20 pl-3">
          &ldquo;{pitch.message}&rdquo;
        </p>
      )}

      {pitch.status === 'submitted' && (
        <div className="space-y-2">
          <textarea
            rows={2}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Optional response message…"
            className="w-full px-3 py-2 border border-white/20 rounded-lg text-xs bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act('accept')}
              disabled={loading}
              className="text-xs bg-accent hover:bg-accent-hover disabled:opacity-60 text-brand font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Accept pitch
            </button>
            <button
              onClick={() => act('reject')}
              disabled={loading}
              className="text-xs bg-white/5 hover:bg-white/10 text-red-400 border border-red-500/30 font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function FounderPitchesPage() {
  const [campaigns, setCampaigns] = useState<CampaignWithPitches[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const campRes = await fetch('/api/founder/campaigns')
      const campData = await campRes.json()
      const liveCampaigns: { id: string; title: string }[] = (campData.campaigns ?? []).filter(
        (c: { status: string }) => c.status === 'live'
      )

      const withPitches = await Promise.all(
        liveCampaigns.map(async (c) => {
          const pRes = await fetch(`/api/campaigns/${c.id}/pitches`)
          const pData = pRes.ok ? await pRes.json() : { pitches: [] }
          return { ...c, pitches: pData.pitches ?? [] }
        })
      )
      setCampaigns(withPitches.filter((c) => c.pitches.length > 0))
      setLoading(false)
    }
    load()
  }, [])

  function handleUpdate(campaignId: string, pitchId: string, newStatus: string) {
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? { ...c, pitches: c.pitches.map((p) => p.id === pitchId ? { ...p, status: newStatus } : p) }
          : c
      )
    )
  }

  if (loading) return <div className="h-40 bg-white/5 rounded-xl animate-pulse m-8" />

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Pitches received</h1>
        <p className="text-sm text-white/50 mt-1">Review and respond to investor proposals for your campaigns.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-12 text-center">
          <p className="text-sm text-white/50">No pitches yet. Once your campaign is live, investors can submit proposals here.</p>
        </div>
      ) : (
        campaigns.map((c) => (
          <div key={c.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-white/5 border-b border-white/10">
              <h2 className="text-sm font-semibold text-white">{c.title}</h2>
              <p className="text-xs text-white/30">{c.pitches.length} pitch{c.pitches.length !== 1 ? 'es' : ''}</p>
            </div>
            <div className="divide-y divide-white/10">
              {c.pitches.map((p) => (
                <PitchRow key={p.id} pitch={p} campaignId={c.id} onUpdate={(id, status) => handleUpdate(c.id, id, status)} />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
