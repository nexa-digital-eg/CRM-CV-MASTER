import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import WhatsappClient from './WhatsappClient'
import { N8N_AUTOMATION_USER_ID } from '@/lib/utils'

export default async function WhatsappPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: messages } = await supabase
    .from('whatsapp_messages')
    .select('id,phone,body,direction,is_ai,created_at,contact_id,contacts(name,ai_enabled)')
    .or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`)
    .order('created_at', { ascending: true })

  return (
    <AppShell>
      <WhatsappClient
        messages={messages ?? []}
        userId={user.id}
        locale={locale}
      />
    </AppShell>
  )
}
