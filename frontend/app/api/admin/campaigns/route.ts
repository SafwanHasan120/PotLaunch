import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PAGE_LIMIT = 20

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await createAdminClient()
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') ?? 'pending_review'
  const page   = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const from   = (page - 1) * PAGE_LIMIT
  const to     = from + PAGE_LIMIT - 1

  const query = createAdminClient()
    .from('campaigns')
    .select(`
      id, title, slug, sector, business_type,
      target_amount_cents, raised_amount_cents,
      profit_share_pct, duration_months,
      status, created_at, funded_at,
      users!founder_id ( id, full_name, barakah_score )
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  const { data, error, count } = status === 'all'
    ? await query
    : await query.eq('status', status)

  if (error) return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })

  return NextResponse.json({ campaigns: data ?? [], total: count ?? 0, page, limit: PAGE_LIMIT })
}
