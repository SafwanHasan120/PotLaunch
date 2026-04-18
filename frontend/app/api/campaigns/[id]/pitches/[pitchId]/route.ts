import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createInvestmentIntent } from '@/lib/services/stripe.service'
import * as contractService from '@/lib/services/contract.service'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  action:   z.enum(['accept', 'reject']),
  response: z.string().max(1000).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; pitchId: string }> }
) {
  const { id: campaignId, pitchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Only the campaign's founder can accept/reject
  const { data: campaign } = await createAdminClient().from('campaigns').select('founder_id, profit_share_pct, duration_months').eq('id', campaignId).single()
  if (!campaign || campaign.founder_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: pitch } = await createAdminClient().from('pitches').select('id, investor_id, proposed_amount_cents, status').eq('id', pitchId).eq('campaign_id', campaignId).single()
  if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 })
  if (pitch.status !== 'submitted' && pitch.status !== 'under_review') {
    return NextResponse.json({ error: 'Pitch is no longer pending' }, { status: 409 })
  }

  const db = createAdminClient()

  if (parsed.data.action === 'reject') {
    await db.from('pitches').update({
      status: 'rejected',
      founder_response: parsed.data.response ?? null,
      responded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', pitchId)
    return NextResponse.json({ status: 'rejected' })
  }

  // Accept: create investment row, form contract, create PaymentIntent
  const { data: investment, error: invErr } = await db
    .from('investments')
    .insert({
      campaign_id:     campaignId,
      investor_id:     pitch.investor_id,
      amount_cents:    pitch.proposed_amount_cents,
      // MVP: use campaign's profit_share_pct; TODO: use pitch's proposed_profit_share_pct
      profit_share_pct: campaign.profit_share_pct,
      stripe_pi_id:    'pending_' + pitchId, // placeholder until PI created
      status:          'pending',
    })
    .select('id')
    .single()

  if (invErr || !investment) {
    return NextResponse.json({ error: 'Failed to create investment' }, { status: 500 })
  }

  const contractId = await contractService.formContract(investment.id, campaignId, pitch.investor_id)

  const { id: piId, clientSecret } = await createInvestmentIntent(
    pitch.investor_id,
    campaignId,
    investment.id,
    pitchId,
    pitch.proposed_amount_cents
  )

  // Update investment with real stripe_pi_id
  await db.from('investments').update({ stripe_pi_id: piId }).eq('id', investment.id)

  // Mark pitch under review (fully accepted when payment succeeds)
  await db.from('pitches').update({
    status: 'under_review',
    founder_response: parsed.data.response ?? null,
    responded_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq('id', pitchId)

  return NextResponse.json({ status: 'accepted', contract_id: contractId, client_secret: clientSecret })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; pitchId: string }> }
) {
  const { id: campaignId, pitchId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: pitch } = await createAdminClient().from('pitches').select('investor_id, status').eq('id', pitchId).eq('campaign_id', campaignId).single()
  if (!pitch) return NextResponse.json({ error: 'Pitch not found' }, { status: 404 })
  if (pitch.investor_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (pitch.status !== 'submitted') return NextResponse.json({ error: 'Can only withdraw submitted pitches' }, { status: 409 })

  await createAdminClient().from('pitches').update({ status: 'withdrawn', updated_at: new Date().toISOString() }).eq('id', pitchId)
  return NextResponse.json({ status: 'withdrawn' })
}
