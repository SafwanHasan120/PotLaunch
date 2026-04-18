import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const campaignId = searchParams.get('campaign_id')
  const page  = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 20
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  let query = admin
    .from('revenue_snapshots')
    .select(`
      id, stripe_account_id, period_start, period_end,
      gross_revenue_cents, net_revenue_cents, charge_count,
      verified_at, created_at, campaign_id,
      campaigns!campaign_id ( title )
    `, { count: 'exact' })
    .order('period_end', { ascending: false })
    .range(from, to)

  if (campaignId) query = query.eq('campaign_id', campaignId)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: 'Failed to fetch snapshots' }, { status: 500 })

  return NextResponse.json({ snapshots: data ?? [], total: count ?? 0, page, limit })
}
