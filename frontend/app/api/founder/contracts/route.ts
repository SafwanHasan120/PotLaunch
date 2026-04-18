import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all contracts for campaigns the current user founded
  const { data, error } = await createAdminClient()
    .from('contracts')
    .select(`
      id, capital_cents, profit_share_pct, duration_months,
      blockchain_address, status, formed_at, completed_at, created_at,
      campaign_id, investor_id, investment_id,
      campaigns!campaign_id ( title, sector ),
      users!investor_id ( full_name )
    `)
    .eq('campaigns.founder_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch contracts' }, { status: 500 })

  return NextResponse.json({ contracts: data ?? [] })
}
