import { createClient } from '@/lib/supabase/server'

export default async function KycPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: kyc } = await supabase
    .from('kyc_verifications')
    .select('status, verified_at')
    .eq('user_id', user!.id)
    .maybeSingle()

  const status = kyc?.status ?? 'not_started'

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Identity Verification</h1>
        <p className="text-sm text-gray-500 mt-1">
          Required before investing in any campaign.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={status} />
          <div>
            <p className="text-sm font-medium text-gray-900">
              {status === 'approved'
                ? 'Identity verified'
                : status === 'in_review'
                ? 'Under review'
                : status === 'rejected'
                ? 'Verification rejected'
                : 'Not yet verified'}
            </p>
            {kyc?.verified_at && (
              <p className="text-xs text-gray-400">
                Verified on {new Date(kyc.verified_at).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>

        {status !== 'approved' && (
          <div className="pt-2">
            <a
              href="/api/kyc/start"
              className="inline-block bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Start verification
            </a>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: 'bg-emerald-100 text-emerald-700',
    in_review: 'bg-yellow-100 text-yellow-700',
    rejected: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-600',
    not_started: 'bg-gray-100 text-gray-500',
  }

  const labels: Record<string, string> = {
    approved: 'Approved',
    in_review: 'In Review',
    rejected: 'Rejected',
    pending: 'Pending',
    not_started: 'Not Started',
  }

  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${styles[status] ?? styles.not_started}`}>
      {labels[status] ?? 'Unknown'}
    </span>
  )
}
