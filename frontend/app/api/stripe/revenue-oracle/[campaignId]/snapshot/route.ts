import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { summarizePeriod, computeAndDistribute } from '@/lib/services/revenue-oracle.service'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  const { campaignId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  // Allow admins or the campaign's own founder
  const { data: profile } = await admin.from('users').select('role').eq('id', user.id).single()
  const { data: campaign } = await admin.from('campaigns').select('founder_id').eq('id', campaignId).single()

  const isAdmin   = profile?.role === 'admin'
  const isFounder = campaign?.founder_id === user.id

  if (!isAdmin && !isFounder) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const periodStart = body.period_start ? new Date(body.period_start) : (() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })()
  const periodEnd = body.period_end ? new Date(body.period_end) : new Date()

  try {
    const snapshotId = await summarizePeriod(campaignId, periodStart, periodEnd)
    await computeAndDistribute(campaignId, snapshotId)
    return NextResponse.json({ snapshot_id: snapshotId })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
