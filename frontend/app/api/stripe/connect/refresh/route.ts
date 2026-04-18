import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isConnectAccountReady } from '@/lib/services/stripe.service'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Stripe redirects here after the user completes (or abandons) Express onboarding.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const stripeAccountId = request.nextUrl.searchParams.get('account')

  if (stripeAccountId) {
    const ready = await isConnectAccountReady(stripeAccountId)

    if (ready) {
      // Ensure the account ID is persisted (may already be set from onboarding POST)
      await createAdminClient()
        .from('users')
        .update({ stripe_account_id: stripeAccountId })
        .eq('id', user.id)

      return NextResponse.redirect(new URL('/wallet?connect=success', request.url))
    }
  }

  // Account not yet fully onboarded — send them back to onboarding
  return NextResponse.redirect(new URL('/wallet?connect=incomplete', request.url))
}
