'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Snapshot = {
  id: string
  period_start: string
  period_end: string
  gross_revenue_cents: number
  net_revenue_cents: number
  charge_count: number
  verified_at: string
  campaign_id: string
}

function formatUSD(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export default function FounderRevenuePage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/wallet/balance')
        if (!res.ok) return
        const params = new URLSearchParams(window.location.search)
        if (params.get('connected') === 'true') setConnected(true)
        else if (params.get('connect') === 'error') setConnected(false)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return <div className="h-40 bg-white/5 rounded-xl animate-pulse" />
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-semibold text-white">Revenue Oracle</h1>
        <p className="text-sm text-white/70 mt-2">
          Connect your business&apos;s Stripe account so PotLaunch can automatically verify revenue and distribute profits to investors.
        </p>
      </div>

      {/* Connection status */}
      <div className="border border-white/10 bg-white/5 shadow-xl rounded-2xl p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-white">Business Stripe account</p>
          <p className="text-xs text-white/60 mt-1">
            Read-only access to your revenue — we never charge your account.
          </p>
        </div>
        {connected ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-accent bg-accent/10 px-3 py-1.5 rounded-full border border-accent/20">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            Connected
          </span>
        ) : (
          <Link
            href="/api/stripe/revenue-oauth/authorize"
            className="text-sm bg-accent hover:bg-accent-hover text-brand font-bold px-6 py-2.5 rounded-xl shadow-[0_4px_15px_rgba(16,185,129,0.2)] transition-all hover:-translate-y-0.5"
          >
            Connect Stripe
          </Link>
        )}
      </div>

      {/* How it works */}
      <div className="bg-accent/10 border border-accent/20 shadow-lg rounded-2xl p-6 text-sm text-white/90 space-y-2">
        <p className="font-semibold text-accent">How the Revenue Oracle works</p>
        <ul className="text-xs text-white/70 space-y-1.5 mt-2 list-disc list-inside">
          <li>Your Stripe charges are read in real-time via secure webhooks</li>
          <li>At each reporting period, your smart contract calculates investor profit shares</li>
          <li>Distributions are triggered automatically — no manual approval needed</li>
          <li>A Wakalah service fee (2.5%) is deducted before investor distributions</li>
        </ul>
      </div>

      {/* Revenue snapshots */}
      <div>
        <h2 className="text-lg font-serif font-medium text-white mb-4">Revenue snapshots</h2>
        {snapshots.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-10 text-center text-sm text-white/50">
            No revenue snapshots yet. Connect your Stripe account and make your first sale.
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
            {snapshots.map((s) => (
              <div key={s.id} className="px-6 py-5 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">
                    {new Date(s.period_start).toLocaleDateString()} – {new Date(s.period_end).toLocaleDateString()}
                  </p>
                  <p className="text-xs text-white/50 mt-1">{s.charge_count} charges · Verified {new Date(s.verified_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-white">{formatUSD(s.gross_revenue_cents)}</p>
                  <p className="text-xs text-white/50 mt-0.5">net {formatUSD(s.net_revenue_cents)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
