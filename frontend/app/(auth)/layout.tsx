// All auth pages use Supabase session — force dynamic to skip static prerendering
export const dynamic = 'force-dynamic'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
