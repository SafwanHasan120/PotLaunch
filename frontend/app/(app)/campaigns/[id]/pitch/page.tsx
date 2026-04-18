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
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center space-y-3">
          <div className="text-3xl">✓</div>
          <h1 className="text-lg font-semibold text-gray-900">Pitch submitted</h1>
          <p className="text-sm text-gray-600">
            The founder will review your proposal. You&apos;ll be notified when they respond.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/investor/pitches" className="text-sm text-emerald-600 hover:underline font-medium">View my pitches</Link>
            <Link href={`/campaigns/${id}`} className="text-sm text-gray-500 hover:underline">Back to campaign</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-md space-y-6">
      <div>
        <Link href={`/campaigns/${id}`} className="text-sm text-gray-500 hover:text-gray-700">← Back to campaign</Link>
        <h1 className="text-2xl font-semibold text-gray-900 mt-3">Submit a pitch</h1>
        <p className="text-sm text-gray-500 mt-1">
          Propose your investment terms. The founder will review and accept or reject your pitch.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Investment amount (USD) <span className="text-red-500">*</span></label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              type="number"
              required
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">
            Desired investor profit share: <span className="text-emerald-700 font-semibold">{profitShare}%</span>
          </label>
          <input
            type="range"
            min="1"
            max="99"
            value={profitShare}
            onChange={(e) => setProfitShare(e.target.value)}
            className="w-full accent-emerald-600"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>1%</span>
            <span>99%</span>
          </div>
          <p className="text-xs text-gray-500">
            This is the % of gross profit you propose investors receive. The founder sets their own terms — this is your starting proposal.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Message (optional)</label>
          <textarea
            rows={3}
            maxLength={2000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Introduce yourself, explain your interest, or ask a question…"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Submitting…' : 'Submit pitch'}
        </button>

        <p className="text-xs text-center text-gray-400">
          Under Mudarabah principles, you bear the risk of business loss. No returns are guaranteed.
        </p>
      </form>
    </div>
  )
}
