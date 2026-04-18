import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const VALID_STATUSES = ['draft', 'pending_review', 'live', 'funded', 'in_progress', 'profit_reporting', 'completed', 'failed']
const PAGE_LIMIT = 12

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status') ?? 'live'
  const sector = searchParams.get('sector')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const from = (page - 1) * PAGE_LIMIT
  const to = from + PAGE_LIMIT - 1

  // Public browse only shows live/funded campaigns; auth users can see more
  const allowedStatuses = user
    ? VALID_STATUSES
    : ['live', 'funded', 'in_progress', 'completed']

  const effectiveStatus = allowedStatuses.includes(status) ? status : 'live'

  let query = supabase
    .from('campaigns')
    .select(`
      id, title, slug, description, sector,
      target_amount_cents, raised_amount_cents,
      min_investment_cents, profit_share_pct,
      duration_months, status, funded_at,
      created_at,
      users!founder_id ( full_name )
    `, { count: 'exact' })
    .eq('status', effectiveStatus)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (sector) {
    query = query.eq('sector', sector)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('GET /api/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }

  return NextResponse.json({
    campaigns: data ?? [],
    total: count ?? 0,
    page,
    limit: PAGE_LIMIT,
  })
}
