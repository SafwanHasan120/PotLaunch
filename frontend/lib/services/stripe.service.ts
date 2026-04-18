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
          product_data: { name: 'Wallet Deposit — AmanahOS' },
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
