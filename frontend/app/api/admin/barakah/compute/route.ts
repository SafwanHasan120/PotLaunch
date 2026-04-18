import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Barakah Score weights (must sum to 1.0)
const W_COMPLETED   = 0.40  // ratio of campaigns that reached 'completed' vs 'failed'
const W_ONTIME      = 0.35  // ratio of distributions that were on time (within 5 days of period_end)
const W_TRANSPARENCY = 0.25 // has business_plan_url + revenue oracle connected + pitch response rate

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = createAdminClient()

  const { data: profile } = await db
    .from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all founders
  const { data: founders } = await db
    .from('users')
    .select('id, revenue_stripe_account_id')
    .eq('role', 'founder')

  if (!founders?.length) return NextResponse.json({ updated: 0 })

  const updated: string[] = []

  for (const founder of founders) {
    const { data: campaigns } = await db
      .from('campaigns')
      .select('id, status, business_plan_url')
      .eq('founder_id', founder.id)

    if (!campaigns?.length) continue

    const campaignIds = campaigns.map((c) => c.id)

    // 1. Completed campaigns ratio
    const terminal = campaigns.filter((c) => c.status === 'completed' || c.status === 'failed')
    const completedRatio = terminal.length > 0
      ? campaigns.filter((c) => c.status === 'completed').length / terminal.length
      : 0.5  // neutral if no terminal campaigns

    // 2. On-time distributions ratio
    const { data: snapshots } = await db
      .from('revenue_snapshots')
      .select('period_end, verified_at')
      .in('campaign_id', campaignIds)

    let ontimeRatio = 0.5  // neutral default
    if (snapshots && snapshots.length > 0) {
      const ontime = snapshots.filter((s) => {
        const periodEnd = new Date(s.period_end).getTime()
        const verified  = new Date(s.verified_at).getTime()
        const diffDays  = (verified - periodEnd) / (1000 * 60 * 60 * 24)
        return diffDays <= 5
      })
      ontimeRatio = ontime.length / snapshots.length
    }

    // 3. Transparency score
    const hasBusinessPlan = campaigns.some((c) => c.business_plan_url)
    const hasOracleConnected = !!founder.revenue_stripe_account_id

    const { data: pitches } = await db
      .from('pitches')
      .select('status')
      .in('campaign_id', campaignIds)

    const totalPitches = pitches?.length ?? 0
    const respondedPitches = pitches?.filter(
      (p) => p.status !== 'submitted'
    ).length ?? 0
    const pitchResponseRate = totalPitches > 0 ? respondedPitches / totalPitches : 0.5

    const transparencyScore =
      (hasBusinessPlan ? 1 : 0) * 0.35 +
      (hasOracleConnected ? 1 : 0) * 0.35 +
      pitchResponseRate * 0.30

    const barakahScore = Math.min(
      10,
      (completedRatio * W_COMPLETED + ontimeRatio * W_ONTIME + transparencyScore * W_TRANSPARENCY) * 10
    )

    await db
      .from('users')
      .update({ barakah_score: Math.round(barakahScore * 100) / 100 })
      .eq('id', founder.id)

    updated.push(founder.id)
  }

  return NextResponse.json({ updated: updated.length, founder_ids: updated })
}
