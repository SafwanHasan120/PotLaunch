import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from('campaigns')
    .select(`
      id, title, sector, business_type,
      target_amount_cents, raised_amount_cents,
      min_investment_cents, profit_share_pct,
      duration_months, status, review_notes, created_at
    `)
    .eq('founder_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })

  return NextResponse.json({ campaigns: data ?? [] })
}
