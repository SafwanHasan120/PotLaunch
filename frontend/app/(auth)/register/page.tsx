'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [wantsToInvest, setWantsToInvest] = useState(true)
  const [wantsToRaise, setWantsToRaise] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!wantsToInvest && !wantsToRaise) {
      setError('Please select at least one option to continue.')
      return
    }

    setLoading(true)

    const role = wantsToRaise ? 'founder' : 'member'

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex bg-background font-sans">
      {/* Left side - Branding */}
      <div className="hidden lg:flex w-[45%] bg-brand text-background p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-light/40 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] translate-y-1/3 -translate-x-1/4"></div>

        <div className="relative z-10">
          <Link href="/" className="text-2xl font-serif font-semibold tracking-tight text-background hover:text-accent transition-colors">
            PotLaunch.
          </Link>
        </div>

        <div className="relative z-10 max-w-md">
          <div className="inline-block bg-yellow-500/20 text-yellow-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 tracking-wide">
            Ethical Investing
          </div>
          <h2 className="text-5xl font-serif font-medium mb-6 leading-[1.1] text-yellow-500">Join a new era of business funding.</h2>
          <p className="text-yellow-400/90 text-lg font-light leading-relaxed">
            Whether you&apos;re raising capital or investing in your community, PotLaunch empowers you with Mudarabah principles. No interest. No Riba.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-2">
            <Link href="/" className="lg:hidden text-2xl font-serif font-semibold text-brand mb-8 block">
              PotLaunch.
            </Link>
            <h1 className="text-3xl font-serif font-medium text-brand">Create your account</h1>
            <p className="text-brand font-light">Join the transparent profit-sharing platform.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="full-name" className="text-sm font-medium text-brand">
                Full name
              </label>
              <input
                id="full-name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand/30 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-brand">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand/30 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-brand">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-brand/30 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent transition-all shadow-sm"
              />
            </div>

            <fieldset className="space-y-3 pt-2">
              <legend className="text-sm font-medium text-brand mb-2">I want to…</legend>
              <label className="flex items-start gap-4 p-4 border border-brand/10 rounded-2xl cursor-pointer hover:border-accent/40 bg-white shadow-sm transition-all has-checked:border-accent has-checked:bg-emerald-50 has-checked:shadow-md group">
                <input
                  type="checkbox"
                  checked={wantsToInvest}
                  onChange={(e) => setWantsToInvest(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-accent border-brand/20 focus:ring-accent rounded"
                />
                <div>
                  <p className="text-base font-medium text-brand">Invest</p>
                  <p className="text-sm text-brand/60 font-light mt-0.5">Fund campaigns and share in their profits</p>
                </div>
              </label>
              <label className="flex items-start gap-4 p-4 border border-brand/10 rounded-2xl cursor-pointer hover:border-accent/40 bg-white shadow-sm transition-all has-checked:border-accent has-checked:bg-emerald-50 has-checked:shadow-md group">
                <input
                  type="checkbox"
                  checked={wantsToRaise}
                  onChange={(e) => setWantsToRaise(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-accent border-brand/20 focus:ring-accent rounded"
                />
                <div>
                  <p className="text-base font-medium text-brand">Raise Funds</p>
                  <p className="text-sm text-brand/60 font-light mt-0.5">Launch a campaign for my startup or project</p>
                </div>
              </label>
            </fieldset>

            {error && (
              <div className="p-4 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-light disabled:opacity-60 text-white font-medium py-3.5 rounded-xl text-base transition-all hover:shadow-lg hover:-translate-y-0.5 mt-4"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-brand font-light">
            Already have an account?{' '}
            <Link href="/login" className="text-accent font-medium hover:text-accent-hover transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
