import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const pitchSchema = z.object({
  proposed_amount_cents:     z.number().int().min(1),
  proposed_profit_share_pct: z.number().min(1).max(99),
  message:                   z.string().max(2000).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only the founder of this campaign can list pitches
  const admin = createAdminClient()
  const { data: campaign } = await admin.from('campaigns').select('founder_id').eq('id', campaignId).single()
  const { data: profile }  = await admin.from('users').select('role').eq('id', user.id).single()

  if (campaign?.founder_id !== user.id && profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('pitches')
    .select('id, proposed_amount_cents, proposed_profit_share_pct, message, status, founder_response, responded_at, created_at, users!investor_id(full_name)')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: 'Failed to fetch pitches' }, { status: 500 })

  return NextResponse.json({ pitches: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const parsed = pitchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  // Validate amount >= campaign minimum
  const { data: campaign } = await createAdminClient().from('campaigns').select('min_investment_cents, status').eq('id', campaignId).single()
  if (!campaign || campaign.status !== 'live') {
    return NextResponse.json({ error: 'Campaign is not accepting pitches' }, { status: 400 })
  }
  if (parsed.data.proposed_amount_cents < campaign.min_investment_cents) {
    return NextResponse.json({ error: `Minimum investment is ${campaign.min_investment_cents} cents` }, { status: 400 })
  }

  const { data: pitch, error } = await createAdminClient()
    .from('pitches')
    .insert({
      campaign_id:               campaignId,
      investor_id:               user.id,
      proposed_amount_cents:     parsed.data.proposed_amount_cents,
      proposed_profit_share_pct: parsed.data.proposed_profit_share_pct,
      message:                   parsed.data.message ?? null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'You already have an open pitch for this campaign' }, { status: 409 })
    return NextResponse.json({ error: 'Failed to submit pitch' }, { status: 500 })
  }

  return NextResponse.json({ id: pitch.id }, { status: 201 })
}
