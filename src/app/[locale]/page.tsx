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

  const automationFilter = `user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`

  const [
    { count: contactsCount },
    { count: dealsCount },
    { count: tasksCount },
    { data: revenueData },
    { data: messages }
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).or(automationFilter),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(won,lost)'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'done'),
    supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'paid'),
    supabase.from('whatsapp_messages').select('id,phone,body,direction,is_ai,created_at').or(automationFilter).order('created_at', { ascending: false }).limit(8)
  ])

  const totalRevenue = revenueData?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0

  const stats = [
    {
      label: t('totalContacts'),
      value: contactsCount ?? 0,
      gradient: 'from-blue-500 to-cyan-400',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      label: t('openDeals'),
      value: dealsCount ?? 0,
      gradient: 'from-violet-500 to-purple-400',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      )
    },
    {
      label: t('pendingTasks'),
      value: tasksCount ?? 0,
      gradient: 'from-amber-500 to-orange-400',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <path d="M9 11l3 3L22 4"/>
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      )
    },
    {
      label: t('totalRevenue'),
      value: formatCurrency(totalRevenue),
      gradient: 'from-emerald-500 to-green-400',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      )
    }
  ]

  return (
    <AppShell>
      <div className="p-6 max-w-6xl mx-auto page-enter">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">{t('title')}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {/* Gradient top bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${stat.gradient}`} />
              <div className="p-5">
                <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl ${stat.bg} ${stat.text} mb-4`}>
                  {stat.icon}
                </div>
                <p className="text-2xl font-bold text-slate-800 leading-none">{stat.value}</p>
                <p className="text-sm text-slate-500 mt-1.5">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent WhatsApp Messages */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-green-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h2 className="font-semibold text-slate-700">{t('recentMessages')}</h2>
            {messages && messages.length > 0 && (
              <span className="ms-auto text-xs bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full font-medium">
                {messages.length}
              </span>
            )}
          </div>

          {!messages?.length ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mb-3 opacity-40">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p className="text-sm">{t('noMessages')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {messages.map((msg, i) => (
                <div
                  key={msg.id}
                  className="flex items-start gap-3 px-6 py-3.5 hover:bg-slate-50 transition-colors"
                  style={{ animationDelay: `${i * 40 + 200}ms`, animation: 'fadeInUp .4s ease both' }}
                >
                  {/* Direction dot */}
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${msg.direction === 'inbound' ? 'bg-green-500' : 'bg-indigo-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 truncate">{msg.body}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{msg.phone}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {msg.is_ai && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">AI</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full ${msg.direction === 'inbound' ? 'bg-green-50 text-green-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {msg.direction === 'inbound' ? '↓' : '↑'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
