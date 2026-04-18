'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const SECTORS = [
  'Technology', 'Food & Beverage', 'Retail', 'Healthcare',
  'Education', 'Real Estate', 'Manufacturing', 'Services', 'Other',
]

export default function NewCampaignPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    title: '',
    description: '',
    sector: '',
    business_type: 'startup' as 'startup' | 'local',
    target_amount: '',
    min_investment: '0.01',
    profit_share_pct: '30',
    profit_interval: 'quarterly' as 'monthly' | 'quarterly' | 'yearly' | 'milestone',
    duration_months: '12',
    business_plan_url: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const targetCents = Math.round(parseFloat(form.target_amount) * 100)
    const minCents = Math.round(parseFloat(form.min_investment) * 100)

    if (isNaN(targetCents) || targetCents < 1_000_000) {
      setError('Minimum fundraising target is $10,000')
      return
    }
    if (isNaN(minCents) || minCents < 1) {
      setError('Minimum investment must be at least $0.01')
      return
    }

    const profitShare = parseFloat(form.profit_share_pct)
    if (isNaN(profitShare) || profitShare < 1 || profitShare > 99) {
      setError('Investor profit share must be between 1% and 99%')
      return
    }

    const duration = parseInt(form.duration_months, 10)
    if (isNaN(duration) || duration < 1 || duration > 60) {
      setError('Duration must be between 1 and 60 months')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          sector: form.sector,
          business_type: form.business_type,
          target_amount_cents: targetCents,
          min_investment_cents: minCents,
          profit_share_pct: profitShare,
          profit_interval: form.profit_interval,
          duration_months: duration,
          business_plan_url: form.business_plan_url.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong')
        return
      }

      router.push(`/campaigns/${data.id}?created=true`)
    } catch {
      setError('Network error — please try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/campaigns" className="text-sm text-white/50 hover:text-white transition-colors">
          ← Back to campaigns
        </Link>
        <h1 className="text-3xl font-serif font-medium text-white mt-4">Launch a campaign</h1>
        <p className="text-sm text-white/70 mt-2">
          Your campaign will be reviewed before going live. Once approved, investors can pitch and fund it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-xl">

        {/* Business type */}
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-white/90">Business type</legend>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-start gap-3 p-4 border border-white/10 rounded-xl cursor-pointer has-checked:border-accent has-checked:bg-accent/10 hover:border-white/20 transition-colors">
              <input
                type="radio"
                name="business_type"
                value="startup"
                checked={form.business_type === 'startup'}
                onChange={() => set('business_type', 'startup')}
                className="mt-1 opacity-70 accent-accent"
              />
              <div>
                <p className="text-sm font-medium text-white">Startup / Corporate</p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">Scalable venture seeking growth capital</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-4 border border-white/10 rounded-xl cursor-pointer has-checked:border-accent has-checked:bg-accent/10 hover:border-white/20 transition-colors">
              <input
                type="radio"
                name="business_type"
                value="local"
                checked={form.business_type === 'local'}
                onChange={() => set('business_type', 'local')}
                className="mt-1 opacity-70 accent-accent"
              />
              <div>
                <p className="text-sm font-medium text-white">Local Business</p>
                <p className="text-xs text-white/50 mt-1 leading-relaxed">Community-rooted, geographically specific</p>
              </div>
            </label>
          </div>
        </fieldset>

        {/* Title */}
        <div className="pt-4 border-t border-white/10">
          <Field label="Campaign title" required>
            <input
              type="text"
              required
              maxLength={120}
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Halal Grocery Store Expansion"
              className={inputCls}
            />
          </Field>
        </div>

        {/* Description */}
        <Field label="Description" required>
          <textarea
            required
            rows={4}
            maxLength={2000}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Describe your business, what you'll do with the capital, and why investors should back you."
            className={inputCls}
          />
        </Field>

        {/* Sector */}
        <Field label="Sector" required>
          <select
            required
            value={form.sector}
            onChange={(e) => set('sector', e.target.value)}
            className={`${inputCls} [&>option]:text-black`}
          >
            <option value="" disabled>Select a sector…</option>
            {SECTORS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>

        {/* Financials */}
        <div className="grid grid-cols-2 gap-6 pt-4 border-t border-white/10">
          <Field label="Fundraising target (USD)" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input
                type="number"
                required
                min="10000"
                step="1000"
                value={form.target_amount}
                onChange={(e) => set('target_amount', e.target.value)}
                placeholder="10,000"
                className={`${inputCls} pl-7`}
              />
            </div>
            <p className="text-xs text-white/40 mt-1.5">Minimum $10,000</p>
          </Field>

          <Field label="Minimum investment (USD)" required>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">$</span>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={form.min_investment}
                onChange={(e) => set('min_investment', e.target.value)}
                className={`${inputCls} pl-7`}
              />
            </div>
            <p className="text-xs text-white/40 mt-1.5">Minimum $0.01</p>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Field label="Investor profit share (%)" required>
            <div className="relative">
              <input
                type="number"
                required
                min="1"
                max="99"
                step="1"
                value={form.profit_share_pct}
                onChange={(e) => set('profit_share_pct', e.target.value)}
                className={`${inputCls} pr-8`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm">%</span>
            </div>
            <p className="text-xs text-white/40 mt-1.5">Investors receive this % of gross profit</p>
          </Field>

          <Field label="Campaign duration (months)" required>
            <input
              type="number"
              required
              min="1"
              max="60"
              value={form.duration_months}
              onChange={(e) => set('duration_months', e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        {/* Profit interval */}
        <div className="pt-4 border-t border-white/10">
          <Field label="Profit reporting interval" required>
            <select
              value={form.profit_interval}
              onChange={(e) => set('profit_interval', e.target.value)}
              className={`${inputCls} [&>option]:text-black`}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
              <option value="milestone">Per Milestone</option>
            </select>
          </Field>
        </div>

        {/* Business plan URL */}
        <div className="pt-4 border-t border-white/10">
          <Field label="Business plan URL (optional)">
            <input
              type="url"
              value={form.business_plan_url}
              onChange={(e) => set('business_plan_url', e.target.value)}
              placeholder="https://…"
              className={inputCls}
            />
            <p className="text-xs text-white/40 mt-1.5">Link to a PDF in Supabase Storage, Google Drive, or similar</p>
          </Field>
        </div>

        {error && (
          <p className="text-sm text-red-100 bg-red-900/50 border border-red-500/30 px-4 py-3 rounded-lg">{error}</p>
        )}

        <div className="pt-6 mt-6">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-60 text-brand font-bold py-3.5 rounded-xl text-base transition-all shadow-[0_4px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_8px_30px_rgba(16,185,129,0.4)]"
          >
            {loading ? 'Submitting for review…' : 'Submit campaign for review'}
          </button>
          <p className="text-xs text-center text-white/40 mt-4 leading-relaxed max-w-sm mx-auto">
            Your campaign will be reviewed by our team before going live. You&apos;ll be notified once approved.
          </p>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full px-4 py-3 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent bg-white/5 text-white placeholder-white/30 transition-all'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/90">
        {label}{required && <span className="text-accent ml-1 font-bold">*</span>}
      </label>
      {children}
    </div>
  )
}
