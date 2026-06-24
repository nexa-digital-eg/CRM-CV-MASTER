import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import OrdersClient from './OrdersClient'
import { N8N_AUTOMATION_USER_ID } from '@/lib/utils'

export default async function OrdersPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const [ordersRes, contactsRes] = await Promise.all([
    supabase.from('orders').select('*, contacts(name, phone)').eq('user_id', user.id).order('created_at', { ascending: false }),
    supabase.from('contacts').select('id,name').or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`).order('name'),
  ])

  return (
    <AppShell>
      <OrdersClient orders={ordersRes.data ?? []} contacts={contactsRes.data ?? []} userId={user.id} locale={locale} />
    </AppShell>
  )
}
