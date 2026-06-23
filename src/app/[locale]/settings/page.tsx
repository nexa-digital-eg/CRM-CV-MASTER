import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import SettingsClient from './SettingsClient'

export default async function SettingsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('settings')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <AppShell>
      <SettingsClient
        initialSettings={settings}
        userId={user.id}
        t={{
          title: t('title'),
          appName: t('appName'),
          whatsappNumber: t('whatsappNumber'),
          n8nWebhook: t('n8nWebhook'),
          language: t('language'),
          currency: t('currency'),
          save: t('save'),
          saved: t('saved')
        }}
      />
    </AppShell>
  )
}
