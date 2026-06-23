import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { N8N_AUTOMATION_USER_ID, formatCurrency } from '@/lib/utils'

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const [
    { count: contactsCount },
    { count: dealsCount },
    { count: tasksCount },
    { data: revenueData },
    { data: messages }
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true })
      .or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`),
    supabase.from('deals').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).not('status', 'in', '(won,lost)'),
    supabase.from('tasks').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).neq('status', 'done'),
    supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'paid'),
    supabase.from('whatsapp_messages').select('id,phone,body,direction,is_ai,created_at')
      .or(`user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`)
      .order('created_at', { ascending: false }).limit(10)
  ])

  const totalRevenue = revenueData?.reduce((sum, inv) => sum + (inv.total || 0), 0) ?? 0

  const stats = [
    { label: t('totalContacts'), value: contactsCount ?? 0, color: 'bg-blue-500' },
    { label: t('openDeals'), value: dealsCount ?? 0, color: 'bg-purple-500' },
    { label: t('pendingTasks'), value: tasksCount ?? 0, color: 'bg-amber-500' },
    { label: t('totalRevenue'), value: formatCurrency(totalRevenue), color: 'bg-green-500' }
  ]

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('title')}</h1>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
              <div className={`w-10 h-10 ${stat.color} rounded-lg mb-3`} />
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
              <p className="text-sm text-slate-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">{t('recentMessages')}</h2>
          {!messages?.length ? (
            <p className="text-slate-400 text-sm">{t('noMessages')}</p>
          ) : (
            <div className="space-y-3">
              {messages.map((msg) => (
                <div key={msg.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    msg.direction === 'inbound' ? 'bg-green-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-600 truncate">{msg.body}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{msg.phone}</p>
                  </div>
                  {msg.is_ai && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full shrink-0">AI</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
