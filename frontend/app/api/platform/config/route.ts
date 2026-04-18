import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// Public keys readable without authentication
const PUBLIC_KEYS = ['wakalah_fee_pct']

export async function GET() {
  const { data, error } = await createAdminClient()
    .from('platform_config')
    .select('key, value, description')
    .in('key', PUBLIC_KEYS)

  if (error) return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })

  const config: Record<string, string> = {}
  for (const row of data ?? []) {
    config[row.key] = row.value
  }

  return NextResponse.json({ config })
}
