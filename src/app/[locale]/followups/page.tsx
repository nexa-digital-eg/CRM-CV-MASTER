import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import FollowupsClient from './FollowupsClient'
import { N8N_AUTOMATION_USER_ID } from '@/lib/utils'

export default async function FollowupsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id,name,phone,status,source,service_interested,next_follow_up')
    .or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`)
    .not('next_follow_up', 'is', null)
    .order('next_follow_up', { ascending: true })

  return (
    <AppShell>
      <FollowupsClient contacts={contacts ?? []} userId={user.id} locale={locale} />
    </AppShell>
  )
}
