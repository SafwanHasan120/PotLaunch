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
  submitted:    'bg-blue-50 text-blue-700',
  under_review: 'bg-amber-50 text-amber-700',
  accepted:     'bg-emerald-50 text-emerald-700',
  rejected:     'bg-red-50 text-red-600',
  withdrawn:    'bg-gray-100 text-gray-500',
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
          <p className="text-sm font-semibold text-gray-900">{pitch.users?.full_name ?? 'Unknown investor'}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {formatUSD(pitch.proposed_amount_cents)} · {pitch.proposed_profit_share_pct}% investor share proposed
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{new Date(pitch.created_at).toLocaleDateString()}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[pitch.status] ?? 'bg-gray-100 text-gray-500'}`}>
          {pitch.status.replace('_', ' ')}
        </span>
      </div>

      {pitch.message && (
        <p className="text-xs text-gray-500 italic border-l-2 border-gray-200 pl-3">
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
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => act('accept')}
              disabled={loading}
              className="text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              Accept pitch
            </button>
            <button
              onClick={() => act('reject')}
              disabled={loading}
              className="text-xs bg-white hover:bg-gray-50 text-red-600 border border-red-200 font-medium px-3 py-1.5 rounded-lg transition-colors"
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
      // Fetch only the founder's own campaigns
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

  if (loading) return <div className="h-40 bg-gray-100 rounded-xl animate-pulse" />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Pitches received</h1>
        <p className="text-sm text-gray-500 mt-1">Review and respond to investor proposals for your campaigns.</p>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl px-5 py-12 text-center">
          <p className="text-sm text-gray-500">No pitches yet. Once your campaign is live, investors can submit proposals here.</p>
        </div>
      ) : (
        campaigns.map((c) => (
          <div key={c.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">{c.title}</h2>
              <p className="text-xs text-gray-400">{c.pitches.length} pitch{c.pitches.length !== 1 ? 'es' : ''}</p>
            </div>
            <div className="divide-y divide-gray-100">
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
