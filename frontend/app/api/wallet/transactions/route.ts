import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))
  const offset = (page - 1) * limit

  const admin = createAdminClient()

  const { data: wallet } = await admin
    .from('wallets')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!wallet) {
    return NextResponse.json({ transactions: [], page, limit, total: 0 })
  }

  const { data: transactions, count } = await admin
    .from('transactions')
    .select('id, direction, tx_type, amount_cents, currency, reference_type, memo, created_at', {
      count: 'exact',
    })
    .eq('wallet_id', wallet.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return NextResponse.json({ transactions: transactions ?? [], page, limit, total: count ?? 0 })
}
