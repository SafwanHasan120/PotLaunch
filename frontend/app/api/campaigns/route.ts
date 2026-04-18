import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { z } from 'zod'

const VALID_STATUSES = ['draft', 'pending_review', 'live', 'funded', 'in_progress', 'profit_reporting', 'completed', 'failed']
const PAGE_LIMIT = 12

const campaignSchema = z.object({
  title:               z.string().min(3).max(120),
  description:         z.string().min(20).max(2000),
  sector:              z.string().min(1),
  business_type:       z.enum(['local', 'startup']),
  target_amount_cents: z.number().int().min(1_000_000),   // min $10k
  min_investment_cents:z.number().int().min(1),             // min $0.01
  profit_share_pct:    z.number().min(1).max(99),
  profit_interval:     z.enum(['monthly', 'quarterly', 'yearly', 'milestone']),
  duration_months:     z.number().int().min(1).max(60),
  business_plan_url:   z.string().url().nullable().optional(),
})

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile, error: profileError } = await createAdminClient()
    .from('users').select('role').eq('id', user.id).single()

  console.error('[campaigns POST] user.id:', user.id, 'email:', user.email, '| profile:', profile, '| profileError:', profileError)


  const body = await request.json().catch(() => null)
  const parsed = campaignSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 })
  }

  const d = parsed.data
  // Generate slug from title
  const slug = d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36)

  const { data: campaign, error } = await createAdminClient()
    .from('campaigns')
    .insert({
      founder_id:           user.id,
      title:                d.title,
      slug,
      description:          d.description,
      sector:               d.sector,
      business_type:        d.business_type,
      target_amount_cents:  d.target_amount_cents,
      min_investment_cents: d.min_investment_cents,
      profit_share_pct:     d.profit_share_pct,
      profit_interval:      d.profit_interval,
      duration_months:      d.duration_months,
      business_plan_url:    d.business_plan_url ?? null,
      status:               'pending_review',
    })
    .select('id')
    .single()

  if (error || !campaign) {
    console.error('POST /api/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to create campaign', debug: error?.message ?? error }, { status: 500 })
  }

  return NextResponse.json({ id: campaign.id }, { status: 201 })
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { searchParams } = request.nextUrl
  const status       = searchParams.get('status') ?? 'live'
  const sector       = searchParams.get('sector')
  const businessType = searchParams.get('business_type')
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const from = (page - 1) * PAGE_LIMIT
  const to = from + PAGE_LIMIT - 1

  // Public browse only shows live/funded campaigns; auth users can see more
  const allowedStatuses = user
    ? VALID_STATUSES
    : ['live', 'funded', 'in_progress', 'completed']

  const effectiveStatus = allowedStatuses.includes(status) ? status : 'live'

  let query = createAdminClient()
    .from('campaigns')
    .select(`
      id, title, slug, description, sector, business_type,
      target_amount_cents, raised_amount_cents,
      min_investment_cents, profit_share_pct,
      duration_months, status, funded_at,
      created_at,
      users!founder_id ( full_name, barakah_score )
    `, { count: 'exact' })
    .eq('status', effectiveStatus)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (sector)       query = query.eq('sector', sector)
  if (businessType) query = query.eq('business_type', businessType)

  const { data, error, count } = await query

  if (error) {
    console.error('GET /api/campaigns error:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }

  return NextResponse.json({
    campaigns: data ?? [],
    total: count ?? 0,
    page,
    limit: PAGE_LIMIT,
  })
}
