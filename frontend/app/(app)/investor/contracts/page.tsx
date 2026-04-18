'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Contract = {
  id: string
  capital_cents: number
  profit_share_pct: number
  duration_months: number
  blockchain_address: string | null
  status: string
  formed_at: string | null
  completed_at: string | null
  created_at: string
  campaign_id: string
  campaigns: { title: string; sector: string } | null
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100)
}

const STATUS_BADGE: Record<string, string> = {
  pending_formation: 'bg-white/10 text-white/40',
  active:            'bg-emerald-500/20 text-emerald-400',
  distributing:      'bg-blue-500/20 text-blue-400',
  completed:         'bg-violet-500/20 text-violet-400',
  voided:            'bg-red-500/20 text-red-400',
}

export default function InvestorContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/investor/contracts')
      .then((r) => r.json())
      .then((d) => setContracts(d.contracts ?? []))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">My contracts</h1>
        <p className="text-sm text-white/50 mt-1">Active and completed Mudarabah contracts.</p>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-12 text-center">
          <p className="text-sm font-medium text-white/70">No contracts yet</p>
          <p className="text-xs text-white/40 mt-1">When a founder accepts your pitch and payment is confirmed, your contract will appear here.</p>
          <Link href="/campaigns" className="inline-block mt-4 text-sm text-accent hover:underline font-medium">
            Browse campaigns →
          </Link>
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-xl divide-y divide-white/10">
          {contracts.map((c) => (
            <Link
              key={c.id}
              href={`/contracts/${c.id}`}
              className="flex items-start justify-between gap-4 p-5 hover:bg-white/5 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{c.campaigns?.title ?? 'Unknown campaign'}</p>
                <p className="text-xs text-white/50 mt-0.5">
                  {formatUSD(c.capital_cents)} · {c.profit_share_pct}% investor share · {c.duration_months}mo
                </p>
                <p className="text-xs text-white/30 mt-0.5">
                  {c.formed_at ? `Active since ${new Date(c.formed_at).toLocaleDateString()}` : `Created ${new Date(c.created_at).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${STATUS_BADGE[c.status] ?? 'bg-white/10 text-white/40'}`}>
                  {c.status.replace(/_/g, ' ')}
                </span>
                {c.blockchain_address && (
                  <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Simulation
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
