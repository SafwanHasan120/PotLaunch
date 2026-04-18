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

      // Redirect to Stripe Checkout
      router.push(data.url)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="text-sm text-gray-500 hover:text-gray-700">
          ← Back to Wallet
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Deposit funds</h1>
        <p className="text-sm text-gray-500 mt-1">
          Funds are held securely in your AmanahOS wallet.
        </p>
      </div>

      <form onSubmit={handleDeposit} className="space-y-5">
        {/* Preset amounts */}
        <div className="grid grid-cols-5 gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                amount === String(preset)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
              }`}
            >
              ${preset}
            </button>
          ))}
        </div>

        {/* Custom amount */}
        <div className="space-y-1">
          <label htmlFor="amount" className="text-sm font-medium text-gray-700">
            Custom amount (USD)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
            <input
              id="amount"
              type="number"
              min="5"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || !amount}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {loading ? 'Redirecting to payment…' : `Deposit${amount ? ` $${parseFloat(amount).toFixed(2)}` : ''}`}
        </button>

        <p className="text-xs text-center text-gray-400">
          Payments are processed securely by Stripe. You will be redirected to complete payment.
        </p>
      </form>
    </div>
  )
}
