import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: campaign, error } = await createAdminClient()
    .from('campaigns')
    .select(`
      id, title, slug, description, sector,
      target_amount_cents, raised_amount_cents,
      min_investment_cents, profit_share_pct,
      profit_interval, duration_months, status,
      business_plan_url, review_notes,
      funded_at, completed_at, created_at, updated_at,
      founder_id,
      users!founder_id ( full_name )
    `)
    .eq('id', id)
    .single()

  if (error || !campaign) {
    return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  }

  // Non-public statuses only visible to the founder or admins
  const publicStatuses = ['live', 'funded', 'in_progress', 'profit_reporting', 'completed']
  if (!publicStatuses.includes(campaign.status)) {
    if (!user) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    // Check if user is founder or admin
    const { data: profile } = await createAdminClient()
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    const isFounder = campaign.founder_id === user.id
    const isAdmin = profile?.role === 'admin'

    if (!isFounder && !isAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
  }

  // Compute funding progress percentage
  const progressPct = campaign.target_amount_cents > 0
    ? Math.min(100, Math.round((campaign.raised_amount_cents / campaign.target_amount_cents) * 100))
    : 0

  // Investor count (approximate — count distinct investments)
  const { count: investorCount } = await createAdminClient()
    .from('investments')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', id)
    .in('status', ['captured', 'active'])

  return NextResponse.json({
    ...campaign,
    progress_pct: progressPct,
    investor_count: investorCount ?? 0,
  })
}
