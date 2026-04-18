import { createAdminClient } from '@/lib/supabase/admin'

// All ledger writes go through Postgres stored procedures (SECURITY DEFINER).
// The admin client bypasses RLS — only call from server-side code (route handlers, webhooks).

function admin() {
  return createAdminClient()
}

export async function ledgerDeposit(
  userWalletId: string,
  stripeWalletId: string,
  amountCents: number,
  stripePiId: string,
  actorId: string
) {
  const { error } = await admin().rpc('ledger_deposit', {
    p_user_wallet: userWalletId,
    p_stripe_wallet: stripeWalletId,
    p_amount_cents: amountCents,
    p_stripe_pi_id: stripePiId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(`ledger_deposit failed: ${error.message}`)
}

export async function ledgerInvest(
  investorWalletId: string,
  escrowWalletId: string,
  amountCents: number,
  campaignId: string,
  investmentId: string,
  stripePiId: string,
  actorId: string
) {
  const { error } = await admin().rpc('ledger_invest', {
    p_investor_wallet: investorWalletId,
    p_escrow_wallet: escrowWalletId,
    p_amount_cents: amountCents,
    p_campaign_id: campaignId,
    p_investment_id: investmentId,
    p_stripe_pi_id: stripePiId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(`ledger_invest failed: ${error.message}`)
}

export async function ledgerMilestoneRelease(
  escrowWalletId: string,
  stripeWalletId: string,
  amountCents: number,
  campaignId: string,
  stripeTxId: string,
  actorId: string
) {
  const { error } = await admin().rpc('ledger_milestone_release', {
    p_escrow_wallet: escrowWalletId,
    p_stripe_wallet: stripeWalletId,
    p_amount_cents: amountCents,
    p_campaign_id: campaignId,
    p_stripe_tx_id: stripeTxId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(`ledger_milestone_release failed: ${error.message}`)
}

export async function ledgerProfitDistribute(
  escrowWalletId: string,
  investorWalletId: string,
  netCents: number,
  feeCents: number,
  distributionId: string,
  stripeTxId: string,
  actorId: string
) {
  const { error } = await admin().rpc('ledger_profit_distribute', {
    p_escrow_wallet: escrowWalletId,
    p_investor_wallet: investorWalletId,
    p_net_cents: netCents,
    p_fee_cents: feeCents,
    p_distribution_id: distributionId,
    p_stripe_tx_id: stripeTxId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(`ledger_profit_distribute failed: ${error.message}`)
}

export async function ledgerRefund(
  escrowWalletId: string,
  stripeWalletId: string,
  amountCents: number,
  investmentId: string,
  stripePiId: string,
  actorId: string
) {
  const { error } = await admin().rpc('ledger_refund', {
    p_escrow_wallet: escrowWalletId,
    p_stripe_wallet: stripeWalletId,
    p_amount_cents: amountCents,
    p_investment_id: investmentId,
    p_stripe_pi_id: stripePiId,
    p_actor_id: actorId,
  })
  if (error) throw new Error(`ledger_refund failed: ${error.message}`)
}

// ─── Wallet helpers ───────────────────────────────────────────────────────────

export async function getWalletId(userId: string): Promise<string> {
  const { data, error } = await admin()
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .single()
  if (error || !data) throw new Error('Wallet not found for user')
  return data.id
}

export async function getSystemWalletId(type: 'platform_escrow' | 'stripe_holding'): Promise<string> {
  const { data, error } = await admin()
    .from('wallets')
    .select('id')
    .eq('account_type', type)
    .is('user_id', null)
    .single()
  if (error || !data) throw new Error(`System wallet '${type}' not found`)
  return data.id
}

export async function getWalletBalance(walletId: string): Promise<number> {
  const { data } = await admin()
    .from('wallet_balances')
    .select('balance_cents')
    .eq('wallet_id', walletId)
    .maybeSingle()
  return data?.balance_cents ?? 0
}

// ─── Webhook dedup ────────────────────────────────────────────────────────────

export async function isEventProcessed(stripeEventId: string): Promise<boolean> {
  const { data } = await admin()
    .from('stripe_events')
    .select('stripe_event_id')
    .eq('stripe_event_id', stripeEventId)
    .maybeSingle()
  return !!data
}

export async function markEventProcessed(stripeEventId: string, eventType: string) {
  await admin().from('stripe_events').insert({ stripe_event_id: stripeEventId, event_type: eventType })
}
