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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch contract — user must be investor or founder of the campaign
  const { data: contract, error } = await admin
    .from('contracts')
    .select(`
      id, capital_cents, profit_share_pct, duration_months,
      blockchain_address, status, formed_at, completed_at, created_at,
      campaign_id, investor_id, investment_id,
      campaigns!campaign_id ( title, founder_id, sector ),
      users!investor_id ( full_name )
    `)
    .eq('id', id)
    .single()

  if (error || !contract) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const campaign = contract.campaigns as { title: string; founder_id: string; sector: string } | null
  const isInvestor = contract.investor_id === user.id
  const isFounder = campaign?.founder_id === user.id

  if (!isInvestor && !isFounder) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch event log
  const { data: events } = await supabase
    .from('contract_events')
    .select('id, event_type, payload, tx_hash, emitted_at')
    .eq('contract_id', id)
    .order('emitted_at', { ascending: true })

  return NextResponse.json({ contract, events: events ?? [] })
}
