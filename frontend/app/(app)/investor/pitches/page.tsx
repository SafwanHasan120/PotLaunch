'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Pitch = {
  id: string
  proposed_amount_cents: number
  proposed_profit_share_pct: number
  message: string | null
  status: string
  founder_response: string | null
  responded_at: string | null
  created_at: string
  campaign_id: string
  campaigns: { title: string; status: string } | null
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

export default function InvestorPitchesPage() {
  const [pitches, setPitches] = useState<Pitch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/investor/pitches')
      .then((r) => r.json())
      .then((d) => setPitches(d.pitches ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My pitches</h1>
        <p className="text-sm text-white/50 mt-1">Track the status of all your investment proposals.</p>
      </div>

      {pitches.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-12 text-center">
          <p className="text-sm font-medium text-white/70">No pitches yet</p>
          <p className="text-xs text-white/40 mt-1">Browse campaigns and submit your first pitch.</p>
          <Link href="/campaigns" className="inline-block mt-4 text-sm text-accent hover:underline font-medium">
            Browse campaigns →
          </Link>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/10">
          {pitches.map((p) => (
            <div key={p.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Link
                    href={`/campaigns/${p.campaign_id}`}
                    className="text-sm font-semibold text-white hover:text-accent"
                  >
                    {p.campaigns?.title ?? 'Unknown campaign'}
                  </Link>
                  <p className="text-xs text-white/50 mt-0.5">
                    {formatUSD(p.proposed_amount_cents)} · {p.proposed_profit_share_pct}% investor share
                  </p>
                  <p className="text-xs text-white/30 mt-0.5">Submitted {new Date(p.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[p.status] ?? 'bg-white/10 text-white/40'}`}>
                  {p.status.replace('_', ' ')}
                </span>
              </div>

              {p.message && (
                <p className="text-xs text-white/40 italic border-l-2 border-white/20 pl-3">
                  &ldquo;{p.message}&rdquo;
                </p>
              )}

              {p.founder_response && (
                <div className="bg-white/5 rounded-lg px-3 py-2 text-xs text-white/60">
                  <span className="font-medium text-white/80">Founder response: </span>{p.founder_response}
                </div>
              )}

              {p.status === 'under_review' && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400">
                  Your pitch was accepted — complete your payment to activate the Mudarabah contract.
                </div>
              )}

              {p.status === 'submitted' && (
                <button
                  onClick={async () => {
                    await fetch(`/api/campaigns/${p.campaign_id}/pitches/${p.id}`, { method: 'DELETE' })
                    setPitches((prev) => prev.map((x) => x.id === p.id ? { ...x, status: 'withdrawn' } : x))
                  }}
                  className="text-xs text-red-400 hover:underline"
                >
                  Withdraw pitch
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
