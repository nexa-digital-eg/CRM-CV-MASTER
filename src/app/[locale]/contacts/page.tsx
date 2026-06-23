import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import ContactsClient from './ContactsClient'
import { N8N_AUTOMATION_USER_ID } from '@/lib/utils'

export default async function ContactsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('contacts')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`)
    .order('created_at', { ascending: false })

  return (
    <AppShell>
      <ContactsClient contacts={contacts ?? []} userId={user.id} t={{
        title: t('title'),
        addContact: t('addContact'),
        name: t('name'),
        email: t('email'),
        phone: t('phone'),
        company: t('company'),
        status: t('status'),
        createdAt: t('createdAt'),
        noContacts: t('noContacts'),
        save: t('save'),
        cancel: t('cancel'),
        status_lead: t('status_lead'),
        status_prospect: t('status_prospect'),
        status_client: t('status_client'),
        status_inactive: t('status_inactive')
      }} />
    </AppShell>
  )
}
