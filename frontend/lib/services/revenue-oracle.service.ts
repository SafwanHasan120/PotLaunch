import { createAdminClient } from '@/lib/supabase/admin'
import * as contractService from '@/lib/services/contract.service'
import { getSystemWalletId, getWalletId } from '@/lib/services/ledger.service'
import { listChargesForAccount } from '@/lib/services/stripe.service'
import type Stripe from 'stripe'

// ─── Revenue Oracle Service ───────────────────────────────────────────────────
//
// Bridges the founder's Stripe revenue (off-chain) with the smart contract
// simulation layer (on-chain). Called from two entry points:
//
//   1. POST /api/stripe/webhooks — real-time event ingestion as charges arrive
//   2. POST /api/stripe/revenue-oracle/[campaignId]/snapshot — period summary + distribution

// ─── processRevenueEvent ─────────────────────────────────────────────────────
// Called for each qualifying charge.succeeded / payment_intent.succeeded event
// that arrives from a connected founder account.

export async function processRevenueEvent(
  event: Stripe.Event,
  campaignId: string
): Promise<void> {
  const db = createAdminClient()

  let amountCents = 0
  let netCents = 0

  if (event.type === 'charge.succeeded') {
    const charge = event.data.object as Stripe.Charge
    amountCents = charge.amount
    netCents = charge.amount - (charge.application_fee_amount ?? 0)
  } else if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object as Stripe.PaymentIntent
    amountCents = pi.amount
    netCents = pi.amount
  } else {
    return
  }

  if (amountCents <= 0) return

  // Find or create an open snapshot for this campaign (today's period)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: existing } = await db
    .from('revenue_snapshots')
    .select('id, gross_revenue_cents, net_revenue_cents, charge_count')
    .eq('campaign_id', campaignId)
    .gte('period_start', today.toISOString())
    .lt('period_end', tomorrow.toISOString())
    .maybeSingle()

  if (existing) {
    await db
      .from('revenue_snapshots')
      .update({
        gross_revenue_cents: existing.gross_revenue_cents + amountCents,
        net_revenue_cents:   existing.net_revenue_cents + netCents,
        charge_count:        existing.charge_count + 1,
        verified_at:         new Date().toISOString(),
        raw_stripe_payload:  event.data.object as unknown as Record<string, unknown>,
      })
      .eq('id', existing.id)
  } else {
    const { data: campaign } = await db
      .from('campaigns')
      .select('users!founder_id(revenue_stripe_account_id)')
      .eq('id', campaignId)
      .single()

    const stripeAccountId = (campaign?.users as { revenue_stripe_account_id?: string } | null)
      ?.revenue_stripe_account_id ?? (event.account ?? '')

    await db.from('revenue_snapshots').insert({
      campaign_id:          campaignId,
      stripe_account_id:    stripeAccountId,
      period_start:         today.toISOString(),
      period_end:           tomorrow.toISOString(),
      gross_revenue_cents:  amountCents,
      net_revenue_cents:    netCents,
      charge_count:         1,
      raw_stripe_payload:   event.data.object as unknown as Record<string, unknown>,
    })
  }
}

// ─── summarizePeriod ─────────────────────────────────────────────────────────
// Fetches all charges from the connected Stripe account for a date range,
// creates a revenue_snapshots row, and calls reportRevenue on each active contract.

export async function summarizePeriod(
  campaignId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<string> {
  const db = createAdminClient()

  const { data: campaign } = await db
    .from('campaigns')
    .select('users!founder_id(revenue_stripe_account_id)')
    .eq('id', campaignId)
    .single()

  const stripeAccountId = (campaign?.users as { revenue_stripe_account_id?: string } | null)
    ?.revenue_stripe_account_id

  if (!stripeAccountId) throw new Error('Campaign founder has not connected their Stripe account')

  const charges = await listChargesForAccount(
    stripeAccountId,
    Math.floor(periodStart.getTime() / 1000),
    Math.floor(periodEnd.getTime() / 1000)
  )

  let grossCents = 0
  let netCents = 0
  let count = 0

  for (const charge of charges.data) {
    if (charge.status !== 'succeeded') continue
    grossCents += charge.amount
    netCents   += charge.amount - (charge.application_fee_amount ?? 0)
    count++
  }

  const { data: snapshot, error } = await db
    .from('revenue_snapshots')
    .insert({
      campaign_id:          campaignId,
      stripe_account_id:    stripeAccountId,
      period_start:         periodStart.toISOString(),
      period_end:           periodEnd.toISOString(),
      gross_revenue_cents:  grossCents,
      net_revenue_cents:    netCents,
      charge_count:         count,
    })
    .select('id')
    .single()

  if (error || !snapshot) throw new Error(`Failed to create snapshot: ${error?.message}`)

  // Report revenue to all active contracts
  const { data: contracts } = await db
    .from('contracts')
    .select('id')
    .eq('campaign_id', campaignId)
    .eq('status', 'active')

  for (const contract of contracts ?? []) {
    await contractService.reportRevenue(contract.id, snapshot.id)
  }

  return snapshot.id
}

// ─── computeAndDistribute ────────────────────────────────────────────────────
// For each active contract on the campaign:
//   1. Calls contractService.calculateProfit()
//   2. Calls contractService.triggerDistribution() → ledger_contract_distribute()

export async function computeAndDistribute(
  campaignId: string,
  snapshotId: string
): Promise<void> {
  const db = createAdminClient()

  const { data: snapshot } = await db
    .from('revenue_snapshots')
    .select('gross_revenue_cents')
    .eq('id', snapshotId)
    .single()

  if (!snapshot) throw new Error('Snapshot not found')

  const { data: contracts } = await db
    .from('contracts')
    .select('id, investor_id')
    .eq('campaign_id', campaignId)
    .eq('status', 'active')

  if (!contracts || contracts.length === 0) return

  const escrowWalletId = await getSystemWalletId('platform_escrow')

  for (const contract of contracts) {
    const { investorShareCents, wakalahCents } = await contractService.calculateProfit(
      contract.id,
      snapshot.gross_revenue_cents
    )

    if (investorShareCents <= 0) continue

    const investorWalletId = await getWalletId(contract.investor_id)

    await contractService.triggerDistribution(
      contract.id,
      escrowWalletId,
      investorWalletId,
      snapshot.gross_revenue_cents,
      wakalahCents,
      snapshotId,
      contract.investor_id
    )
  }
}
