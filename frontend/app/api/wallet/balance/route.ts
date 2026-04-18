import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: wallet } = await supabase
    .from('wallets')
    .select('id, currency')
    .eq('user_id', user.id)
    .single()

  if (!wallet) {
    return NextResponse.json({ balance_cents: 0, currency: 'USD' })
  }

  const { data: balance } = await supabase
    .from('wallet_balances')
    .select('balance_cents, currency')
    .eq('wallet_id', wallet.id)
    .maybeSingle()

  return NextResponse.json({
    wallet_id: wallet.id,
    balance_cents: balance?.balance_cents ?? 0,
    currency: balance?.currency ?? wallet.currency,
  })
}
