import { createClient } from '@/lib/supabase/server'
import { createDepositSession } from '@/lib/services/stripe.service'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  amount_cents: z.number().int().min(500).max(100000_00), // $5 – $100,000
})

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid amount', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const url = await createDepositSession(user.id, user.email!, parsed.data.amount_cents)

  return NextResponse.json({ url })
}
