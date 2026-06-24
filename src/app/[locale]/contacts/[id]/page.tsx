import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import ContactProfileClient from './ContactProfileClient'
import { N8N_AUTOMATION_USER_ID } from '@/lib/utils'

export default async function ContactProfilePage({
  params
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: contact } = await supabase
    .from('contacts')
    .select('*')
    .eq('id', id)
    .or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`)
    .single()

  if (!contact) redirect(`/${locale}/contacts`)

  const [notesRes, timelineRes, ordersRes, paymentsRes, messagesRes] = await Promise.all([
    supabase.from('contact_notes').select('*').eq('contact_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('timeline_events').select('*').eq('contact_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('orders').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    supabase.from('payments').select('*').eq('contact_id', id).order('created_at', { ascending: false }),
    supabase.from('whatsapp_messages').select('*').or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`).eq('contact_id', id).order('created_at', { ascending: true }).limit(100),
  ])

  return (
    <AppShell>
      <ContactProfileClient
        contact={contact}
        notes={notesRes.data ?? []}
        timeline={timelineRes.data ?? []}
        orders={ordersRes.data ?? []}
        payments={paymentsRes.data ?? []}
        messages={messagesRes.data ?? []}
        userId={user.id}
        locale={locale}
      />
    </AppShell>
  )
}
