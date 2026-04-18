import { stripe } from '@/lib/stripe/client'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!

// ─── Customer ────────────────────────────────────────────────────────────────

export async function getOrCreateCustomer(userId: string, email: string): Promise<string> {
  const db = createAdminClient()

  const { data: user } = await db
    .from('users')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single()

  if (user?.stripe_customer_id) return user.stripe_customer_id

  const customer = await stripe.customers.create({
    email,
    metadata: { supabase_user_id: userId },
  })

  await db
    .from('users')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId)

  return customer.id
}

// ─── Deposit (Stripe Checkout Session) ───────────────────────────────────────

export async function createDepositSession(
  userId: string,
  email: string,
  amountCents: number
) {
  const customerId = await getOrCreateCustomer(userId, email)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amountCents,
          product_data: { name: 'Wallet Deposit — PotLaunch' },
        },
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/wallet?deposit=success`,
    cancel_url: `${APP_URL}/wallet/deposit`,
    metadata: {
      type: 'wallet_deposit',
      user_id: userId,
    },
  })

  return session.url!
}

// ─── Connect (Express accounts for founders + investors) ─────────────────────

export async function createConnectAccount(
  userId: string,
  email: string,
  countryCode: string
): Promise<string> {
  const db = createAdminClient()

  const { data: user } = await db
    .from('users')
    .select('stripe_account_id')
    .eq('id', userId)
    .single()

  if (user?.stripe_account_id) return user.stripe_account_id

  const account = await stripe.accounts.create({
    type: 'express',
    country: countryCode,
    email,
    metadata: { supabase_user_id: userId },
  })

  await db
    .from('users')
    .update({ stripe_account_id: account.id })
    .eq('id', userId)

  return account.id
}

export async function createConnectOnboardingLink(
  stripeAccountId: string
): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: 'account_onboarding',
    return_url: `${APP_URL}/api/stripe/connect/refresh?account=${stripeAccountId}`,
    refresh_url: `${APP_URL}/api/stripe/connect/onboarding`,
  })
  return link.url
}

export async function isConnectAccountReady(stripeAccountId: string): Promise<boolean> {
  const account = await stripe.accounts.retrieve(stripeAccountId)
  return account.charges_enabled === true
}

// ─── Transfers (milestone + profit payouts) ───────────────────────────────────

export async function transferToConnectedAccount(
  destinationAccountId: string,
  amountCents: number,
  transferGroup: string,
  metadata: Record<string, string>
): Promise<string> {
  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'usd',
    destination: destinationAccountId,
    transfer_group: transferGroup,
    metadata,
  })
  return transfer.id
}

// ─── Refunds ──────────────────────────────────────────────────────────────────

export async function refundPaymentIntent(paymentIntentId: string): Promise<string> {
  const refund = await stripe.refunds.create({
    payment_intent: paymentIntentId,
  })
  return refund.id
}

// ─── Revenue Oracle OAuth (founder's own business Stripe account) ─────────────
// This is SEPARATE from the Express payout account (stripe_account_id).
// We request read_only scope to receive their revenue webhooks.

export function createRevenueOAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.STRIPE_CLIENT_ID!,
    scope: 'read_write',
    state,
    redirect_uri: `${APP_URL}/api/stripe/revenue-oauth/callback`,
  })
  return `https://connect.stripe.com/oauth/authorize?${params}`
}

export async function exchangeRevenueOAuthCode(code: string): Promise<string> {
  // @ts-expect-error — stripe.oauth exists but types may lag SDK version
  const response = await stripe.oauth.token({ grant_type: 'authorization_code', code })
  return response.stripe_user_id as string
}

export async function listChargesForAccount(
  stripeAccountId: string,
  createdGte: number,
  createdLte: number
) {
  return stripe.charges.list(
    { created: { gte: createdGte, lte: createdLte }, limit: 100 },
    { stripeAccount: stripeAccountId }
  )
}

// ─── Investment PaymentIntent (pitch-accepted flow) ───────────────────────────

export async function createInvestmentIntent(
  investorId: string,
  campaignId: string,
  investmentId: string,
  pitchId: string,
  amountCents: number
): Promise<{ id: string; clientSecret: string }> {
  const db = createAdminClient()
  const { data: investor } = await db.from('users').select('stripe_customer_id').eq('id', investorId).single()

  const customerId = investor?.stripe_customer_id ?? (await getOrCreateCustomer(investorId, ''))

  const pi = await stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    payment_method_types: ['card'],
    transfer_group: `campaign_${campaignId}`,
    metadata: {
      type:          'growth_investment',
      campaign_id:   campaignId,
      investor_id:   investorId,
      investment_id: investmentId,
      pitch_id:      pitchId,
    },
  })

  return { id: pi.id, clientSecret: pi.client_secret! }
}
