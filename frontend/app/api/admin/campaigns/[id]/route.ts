import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const patchSchema = z.object({
  action:       z.enum(['approve', 'reject']),
  review_notes: z.string().max(2000).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await createAdminClient()
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  const { data: campaign } = await createAdminClient()
    .from('campaigns').select('status').eq('id', id).single()
  if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
  if (campaign.status !== 'pending_review') {
    return NextResponse.json({ error: 'Campaign is not pending review' }, { status: 409 })
  }

  const newStatus = parsed.data.action === 'approve' ? 'live' : 'failed'

  await createAdminClient()
    .from('campaigns')
    .update({
      status:       newStatus,
      review_notes: parsed.data.review_notes ?? null,
      updated_at:   new Date().toISOString(),
    })
    .eq('id', id)

  return NextResponse.json({ status: newStatus })
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await createAdminClient()
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data, error } = await createAdminClient()
    .from('campaigns')
    .select(`
      id, title, slug, description, sector, business_type,
      target_amount_cents, raised_amount_cents,
      min_investment_cents, profit_share_pct,
      profit_interval, duration_months, business_plan_url,
      status, review_notes, created_at, funded_at,
      users!founder_id ( id, full_name, email, barakah_score )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })

  return NextResponse.json({ campaign: data })
}
