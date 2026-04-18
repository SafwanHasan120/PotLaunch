import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await createAdminClient()
    .from('pitches')
    .select('id, proposed_amount_cents, proposed_profit_share_pct, message, status, founder_response, responded_at, created_at, campaign_id, campaigns!campaign_id(title, status)')
    .eq('investor_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch pitches' }, { status: 500 })

  return NextResponse.json({ pitches: data ?? [] })
}
