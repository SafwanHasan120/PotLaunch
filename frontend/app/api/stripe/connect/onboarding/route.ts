import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createConnectAccount, createConnectOnboardingLink } from '@/lib/services/stripe.service'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await createAdminClient()
    .from('users')
    .select('stripe_account_id, country_code')
    .eq('id', user.id)
    .single()

  const countryCode = profile?.country_code ?? 'US'

  const stripeAccountId =
    profile?.stripe_account_id ??
    (await createConnectAccount(user.id, user.email!, countryCode))

  const onboardingUrl = await createConnectOnboardingLink(stripeAccountId)

  return NextResponse.json({ url: onboardingUrl })
}
