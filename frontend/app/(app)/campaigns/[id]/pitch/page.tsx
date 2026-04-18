'use client'

import { useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function PitchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [amount, setAmount] = useState('')
  const [profitShare, setProfitShare] = useState('30')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents <= 0) {
      setError('Enter a valid investment amount')
      return
    }
    const share = parseFloat(profitShare)
    if (isNaN(share) || share < 1 || share > 99) {
      setError('Profit share must be between 1% and 99%')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/campaigns/${id}/pitches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proposed_amount_cents:     amountCents,
          proposed_profit_share_pct: share,
          message:                   message.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }
      setSubmitted(true)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="p-8 max-w-md">
        <div className="bg-accent/10 border border-accent/20 rounded-2xl p-8 text-center space-y-4">
          <div className="w-14 h-14 bg-accent/20 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl text-accent">✓</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Pitch submitted</h1>
          <p className="text-sm text-white/60">
            The founder will review your proposal. You&apos;ll be notified when they respond.
          </p>
          <div className="flex gap-4 justify-center pt-2">
            <Link href="/investor/pitches" className="text-sm text-accent hover:underline font-medium">View my pitches</Link>
            <Link href={`/campaigns/${id}`} className="text-sm text-white/50 hover:text-white">Back to campaign</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-md space-y-6">
      <div>
        <Link href={`/campaigns/${id}`} className="text-sm text-white/50 hover:text-white transition-colors">
          ← Back to campaign
        </Link>
        <h1 className="text-2xl font-semibold text-white mt-3">Submit a pitch</h1>
        <p className="text-sm text-white/60 mt-1">
          Propose your investment terms. The founder will review and accept or reject your pitch.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/90">
            Investment amount (USD) <span className="text-accent font-bold">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2.5 border border-white/20 rounded-xl text-sm bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/90">
            Desired investor profit share: <span className="text-accent font-bold">{profitShare}%</span>
          </label>
          <input
            type="range"
            min="1"
            max="99"
            value={profitShare}
            onChange={(e) => setProfitShare(e.target.value)}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-xs text-white/30">
            <span>1%</span>
            <span>99%</span>
          </div>
          <p className="text-xs text-white/40">
            This is the % of gross profit you propose investors receive. The founder sets their own terms — this is your starting proposal.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/90">Message <span className="text-white/40 font-normal">(optional)</span></label>
          <textarea
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself, explain your interest, or ask a question…"
            className="w-full px-3 py-2.5 border border-white/20 rounded-xl text-sm bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all resize-none"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-brand font-bold py-3 rounded-xl text-sm transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)]"
        >
          {loading ? 'Submitting…' : 'Submit pitch'}
        </button>

        <p className="text-xs text-center text-white/30">
          Under Mudarabah principles, you bear the risk of business loss. No returns are guaranteed.
        </p>
      </form>
    </div>
  )
}
