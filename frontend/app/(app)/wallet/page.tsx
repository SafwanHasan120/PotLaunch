import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function WalletPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get wallet id
  const { data: wallet } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  // Get balance from view
  const { data: balance } = wallet
    ? await supabase
        .from('wallet_balances')
        .select('balance_cents, currency')
        .eq('wallet_id', wallet.id)
        .maybeSingle()
    : { data: null }

  // Get recent transactions
  const { data: transactions } = wallet
    ? await supabase
        .from('transactions')
        .select('id, direction, tx_type, amount_cents, currency, memo, created_at')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const balanceCents = balance?.balance_cents ?? 0
  const currency = balance?.currency ?? 'USD'

  function formatMoney(cents: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(cents / 100)
  }

  return (
    <div className="p-8 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900">Wallet</h1>

      {/* Balance card */}
      <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 text-white space-y-1">
        <p className="text-sm opacity-75">Available balance</p>
        <p className="text-4xl font-bold">{formatMoney(balanceCents)}</p>
        <p className="text-xs opacity-60">{currency}</p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href="/wallet/deposit"
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          Deposit
        </Link>
      </div>

      {/* Transaction history */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-700">Recent transactions</h2>
        </div>

        {!transactions || transactions.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            No transactions yet.
          </div>
        ) : (
          transactions.map((tx) => (
            <div key={tx.id} className="px-5 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 capitalize">
                  {tx.tx_type.replace(/_/g, ' ')}
                </p>
                {tx.memo && <p className="text-xs text-gray-400">{tx.memo}</p>}
                <p className="text-xs text-gray-400">
                  {new Date(tx.created_at).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-sm font-semibold ${
                  tx.direction === 'credit' ? 'text-emerald-600' : 'text-red-500'
                }`}
              >
                {tx.direction === 'credit' ? '+' : '-'}{formatMoney(tx.amount_cents)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
