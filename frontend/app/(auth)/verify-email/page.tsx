export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-8 text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900">Check your inbox</h1>
        <p className="text-sm text-gray-500">
          We sent you a confirmation link. Click it to activate your account and continue.
        </p>
        <p className="text-xs text-gray-400">
          Didn&apos;t receive it? Check your spam folder or{' '}
          <a href="/register" className="text-emerald-600 hover:underline">
            try again
          </a>.
        </p>
      </div>
    </div>
  )
}
