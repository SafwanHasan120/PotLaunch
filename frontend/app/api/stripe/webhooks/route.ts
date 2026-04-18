import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  isEventProcessed,
  markEventProcessed,
  ledgerDeposit,
  ledgerInvest,
  ledgerRefund,
  getWalletId,
  getSystemWalletId,
} from '@/lib/services/ledger.service'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type Stripe from 'stripe'

// Raw body required for Stripe signature verification — do NOT parse as JSON first
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotency: skip if already processed
  if (await isEventProcessed(event.id)) {
    return NextResponse.json({ received: true, skipped: 'duplicate' })
  }

  try {
    await handleEvent(event)
    await markEventProcessed(event.id, event.type)
  } catch (err) {
    console.error(`Webhook handler failed for event ${event.id} (${event.type}):`, err)
    // Return 500 so Stripe retries
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
      break

    case 'payment_intent.succeeded':
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
      break

    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge)
      break

    default:
      // Unhandled event types are fine — just acknowledge
      break
  }
}

// ─── checkout.session.completed ──────────────────────────────────────────────
// Fired when a Stripe Checkout Session payment completes (wallet deposits)

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const { type, user_id } = session.metadata ?? {}

  if (type !== 'wallet_deposit' || !user_id) return

  const amountCents = session.amount_total
  if (!amountCents) return

  const [userWalletId, stripeWalletId] = await Promise.all([
    getWalletId(user_id),
    getSystemWalletId('stripe_holding'),
  ])

  await ledgerDeposit(userWalletId, stripeWalletId, amountCents, session.payment_intent as string, user_id)
}

// ─── payment_intent.succeeded ────────────────────────────────────────────────
// Fired when a PaymentIntent succeeds (investments captured directly)

async function handlePaymentIntentSucceeded(pi: Stripe.PaymentIntent) {
  const { type, campaign_id, investor_id, investment_id } = pi.metadata ?? {}

  if (type !== 'growth_investment') return
  if (!campaign_id || !investor_id || !investment_id) return

  const db = createAdminClient()

  // Get wallet IDs
  const [investorWalletId, escrowWalletId] = await Promise.all([
    getWalletId(investor_id),
    (async () => {
      // Each campaign has its own escrow sub-wallet; fall back to platform escrow
      const { data: campaign } = await db
        .from('campaigns')
        .select('escrow_wallet_id')
        .eq('id', campaign_id)
        .single()
      return campaign?.escrow_wallet_id ?? (await getSystemWalletId('platform_escrow'))
    })(),
  ])

  // Write ledger entries
  await ledgerInvest(investorWalletId, escrowWalletId, pi.amount, campaign_id, investment_id, pi.id, investor_id)

  // Update investment status to 'captured'
  await db
    .from('investments')
    .update({ status: 'captured', updated_at: new Date().toISOString() })
    .eq('id', investment_id)

  // Update campaign raised_amount_cents and check if fully funded
  const { data: investment } = await db
    .from('investments')
    .select('amount_cents, campaign_id')
    .eq('id', investment_id)
    .single()

  if (!investment) return

  const { data: campaign } = await db
    .from('campaigns')
    .select('target_amount_cents, raised_amount_cents, status')
    .eq('id', campaign_id)
    .single()

  if (!campaign || campaign.status !== 'live') return

  const newRaised = (campaign.raised_amount_cents ?? 0) + investment.amount_cents

  const update: Record<string, unknown> = {
    raised_amount_cents: newRaised,
    updated_at: new Date().toISOString(),
  }

  if (newRaised >= campaign.target_amount_cents) {
    update.status = 'funded'
    update.funded_at = new Date().toISOString()
  }

  await db.from('campaigns').update(update).eq('id', campaign_id)
}

// ─── charge.refunded ─────────────────────────────────────────────────────────
// Fired when a charge is refunded (failed campaigns)

async function handleChargeRefunded(charge: Stripe.Charge) {
  const piId = charge.payment_intent as string
  if (!piId) return

  const db = createAdminClient()

  const { data: investment } = await db
    .from('investments')
    .select('id, investor_id, amount_cents, campaign_id, status')
    .eq('stripe_pi_id', piId)
    .maybeSingle()

  if (!investment || investment.status === 'refunded') return

  const { data: campaign } = await db
    .from('campaigns')
    .select('escrow_wallet_id')
    .eq('id', investment.campaign_id)
    .single()

  const escrowWalletId = campaign?.escrow_wallet_id ?? (await getSystemWalletId('platform_escrow'))
  const stripeWalletId = await getSystemWalletId('stripe_holding')

  await ledgerRefund(
    escrowWalletId,
    stripeWalletId,
    investment.amount_cents,
    investment.id,
    piId,
    investment.investor_id
  )

  await db
    .from('investments')
    .update({ status: 'refunded', refunded_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', investment.id)
}
