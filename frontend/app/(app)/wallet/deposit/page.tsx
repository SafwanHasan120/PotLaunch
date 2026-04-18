'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const PRESETS = [50, 100, 250, 500, 1000]

export default function DepositPage() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amountCents = Math.round(parseFloat(amount) * 100)
    if (isNaN(amountCents) || amountCents < 500) {
      setError('Minimum deposit is $5.00')
      return
    }
    if (amountCents > 100000_00) {
      setError('Maximum deposit is $100,000')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount_cents: amountCents }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      router.push(data.url)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md space-y-6">
      <Link href="/wallet" className="text-sm text-white/50 hover:text-white transition-colors">
        ← Back to Wallet
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-white">Deposit funds</h1>
        <p className="text-sm text-white/60 mt-1">Funds are held securely in your PotLaunch wallet.</p>
      </div>

      <form onSubmit={handleDeposit} className="space-y-5 bg-white/5 border border-white/10 rounded-2xl p-6">
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                amount === String(preset)
                  ? 'bg-accent text-brand border-accent'
                  : 'bg-white/5 text-white/70 border-white/20 hover:border-accent/50'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium text-white/90">
            Custom amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
            <input
              id="amount"
              type="number"
              min="5"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2.5 border border-white/20 rounded-lg text-sm bg-white/5 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-brand font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Redirecting to payment…' : `Deposit${amount ? ` $${parseFloat(amount).toFixed(2)}` : ''}`}
        </button>

        <p className="text-xs text-center text-white/30">
          Payments are processed securely by Stripe. You will be redirected to complete payment.
        </p>
      </form>
    </div>
  )
}
