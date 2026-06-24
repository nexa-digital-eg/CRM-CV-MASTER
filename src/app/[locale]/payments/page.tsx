import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import PaymentsClient from './PaymentsClient'

export default async function PaymentsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: payments } = await supabase
    .from('payments')
    .select('*, contacts(name, phone)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <AppShell>
      <PaymentsClient payments={payments ?? []} userId={user.id} locale={locale} />
    </AppShell>
  )
}
