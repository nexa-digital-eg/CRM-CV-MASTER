import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { N8N_AUTOMATION_USER_ID, formatCurrency } from '@/lib/utils'

function timeAgo(dateStr: string | null, isAr: boolean): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return isAr ? 'الآن' : 'now'
  if (mins < 60) return isAr ? `${mins}د` : `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return isAr ? `${hrs}س` : `${hrs}h`
  return isAr ? `${Math.floor(hrs / 24)}ي` : `${Math.floor(hrs / 24)}d`
}

export default async function DashboardPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('dashboard')
  const supabase = await createClient()
  const isAr = locale === 'ar'

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const automationFilter = `user_id.eq.${user.id},user_id.eq.${N8N_AUTOMATION_USER_ID}`

  const [
    { count: contactsCount },
    { count: aiContactsCount },
    { count: dealsCount },
    { count: tasksCount },
    { count: whatsappTotal },
    { count: whatsappInbound },
    { data: revenueData },
    { data: messages }
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).or(automationFilter),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).or(automationFilter).eq('ai_enabled', true),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('user_id', user.id).not('status', 'in', '(won,lost)'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', user.id).neq('status', 'done'),
    supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).or(automationFilter),
    supabase.from('whatsapp_messages').select('*', { count: 'exact', head: true }).or(automationFilter).eq('direction', 'inbound'),
    supabase.from('invoices').select('total').eq('user_id', user.id).eq('status', 'paid'),
    supabase.from('whatsapp_messages')
      .select('id,phone,body,direction,is_ai,created_at')
      .or(automationFilter)
      .order('created_at', { ascending: false })
      .limit(12)
  ])

  const totalRevenue = revenueData?.reduce((s, i) => s + (i.total ?? 0), 0) ?? 0

  const dateStr = new Date().toLocaleDateString(isAr ? 'ar-SA' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })

  const statCards = [
    {
      value: whatsappTotal ?? 0,
      label: t('whatsappMessages'),
      badge: `${whatsappInbound ?? 0} ${t('inboundMessages')}`,
      iconColor: '#22c55e',
      iconBg: 'rgba(34,197,94,0.12)',
      iconBorder: 'rgba(34,197,94,0.2)',
      badgeBg: 'rgba(34,197,94,0.1)',
      badgeText: '#22c55e',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          <circle cx="9" cy="10" r="1" fill="#22c55e" stroke="none"/>
          <circle cx="12" cy="10" r="1" fill="#22c55e" stroke="none"/>
          <circle cx="15" cy="10" r="1" fill="#22c55e" stroke="none"/>
        </svg>
      )
    },
    {
      value: contactsCount ?? 0,
      label: t('totalContacts'),
      badge: `${aiContactsCount ?? 0} ${t('aiEnabled')}`,
      iconColor: '#818cf8',
      iconBg: 'rgba(99,102,241,0.12)',
      iconBorder: 'rgba(99,102,241,0.2)',
      badgeBg: 'rgba(99,102,241,0.1)',
      badgeText: '#818cf8',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      )
    },
    {
      value: dealsCount ?? 0,
      label: t('openDeals'),
      badge: `${tasksCount ?? 0} ${t('pendingTasks')}`,
      iconColor: '#fb923c',
      iconBg: 'rgba(251,146,60,0.12)',
      iconBorder: 'rgba(251,146,60,0.2)',
      badgeBg: 'rgba(251,146,60,0.1)',
      badgeText: '#fb923c',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      )
    },
    {
      value: formatCurrency(totalRevenue),
      label: t('totalRevenue'),
      badge: isAr ? 'مدفوعة' : 'Paid',
      iconColor: '#10b981',
      iconBg: 'rgba(16,185,129,0.12)',
      iconBorder: 'rgba(16,185,129,0.2)',
      badgeBg: 'rgba(16,185,129,0.1)',
      badgeText: '#10b981',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
        </svg>
      )
    }
  ]

  const quickLinks = [
    {
      href: `/${locale}/whatsapp`,
      label: isAr ? 'واتساب AI' : 'WhatsApp AI',
      color: '#22c55e',
      bg: 'rgba(34,197,94,0.12)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      )
    },
    {
      href: `/${locale}/contacts`,
      label: isAr ? 'العملاء' : 'Contacts',
      color: '#818cf8',
      bg: 'rgba(99,102,241,0.12)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
        </svg>
      )
    },
    {
      href: `/${locale}/deals`,
      label: isAr ? 'الصفقات' : 'Deals',
      color: '#fb923c',
      bg: 'rgba(251,146,60,0.12)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
          <polyline points="16 7 22 7 22 13"/>
        </svg>
      )
    },
    {
      href: `/${locale}/invoices`,
      label: isAr ? 'الفواتير' : 'Invoices',
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )
    }
  ]

  const services = [
    { emoji: '📄', name: isAr ? 'تصميم CV احترافي' : 'Professional CV Design', sub: isAr ? 'عربي / إنجليزي / ATS' : 'Arabic / English / ATS', color: '#818cf8', bg: 'rgba(99,102,241,0.06)', border: 'rgba(99,102,241,0.12)' },
    { emoji: '💼', name: isAr ? 'تحسين LinkedIn' : 'LinkedIn Optimization', sub: isAr ? 'وحسابات التوظيف' : '+ Job platforms', color: '#22c55e', bg: 'rgba(34,197,94,0.06)', border: 'rgba(34,197,94,0.12)' },
    { emoji: '🤖', name: 'AI Sales Agent', sub: isAr ? 'واتساب ومنصات أخرى' : 'WhatsApp & more', color: '#a855f7', bg: 'rgba(168,85,247,0.06)', border: 'rgba(168,85,247,0.12)' },
  ]

  return (
    <AppShell>
      <div style={{ background: 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)', minHeight: '100%' }} className="p-6">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{t('title')}</h1>
            <p className="text-slate-500 text-sm mt-1">{dateStr}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-xl px-4 py-2"
            style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-sm font-medium">{t('activeSystem')}</span>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl p-5"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: card.iconBg, border: `1px solid ${card.iconBorder}` }}>
                  {card.icon}
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full leading-none"
                  style={{ background: card.badgeBg, color: card.badgeText }}>
                  {card.badge}
                </span>
              </div>
              <p className="text-3xl font-bold text-white leading-none">{card.value}</p>
              <p className="text-slate-500 text-sm mt-2">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* WhatsApp Activity (2/3) */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.12)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <h2 className="font-semibold text-white text-sm">{t('recentMessages')}</h2>
              </div>
              {messages && messages.length > 0 && (
                <Link
                  href={`/${locale}/whatsapp`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  {t('viewAll')} →
                </Link>
              )}
            </div>

            {!messages?.length ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" className="w-6 h-6">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                </div>
                <p className="text-slate-600 text-sm">{t('noMessages')}</p>
              </div>
            ) : (
              <div>
                {messages.map((msg) => {
                  const isIn = msg.direction === 'inbound'
                  const lastTwo = (msg.phone ?? '').slice(-2)
                  return (
                    <div
                      key={msg.id}
                      className="flex items-center gap-3 px-6 py-3 transition-colors hover:bg-white/[0.02]"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {/* Avatar */}
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold"
                        style={{
                          background: isIn ? 'rgba(34,197,94,0.15)' : 'rgba(99,102,241,0.15)',
                          color: isIn ? '#22c55e' : '#818cf8'
                        }}
                      >
                        {lastTwo}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs font-mono">{msg.phone}</span>
                          {msg.is_ai && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium"
                              style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}
                            >
                              AI
                            </span>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm truncate mt-0.5">{msg.body}</p>
                      </div>

                      {/* Meta */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="text-slate-600 text-xs">{timeAgo(msg.created_at, isAr)}</span>
                        <span
                          className="text-xs px-1.5 py-0.5 rounded font-medium"
                          style={{
                            background: isIn ? 'rgba(34,197,94,0.08)' : 'rgba(99,102,241,0.08)',
                            color: isIn ? '#22c55e' : '#818cf8'
                          }}
                        >
                          {isIn ? '↓' : '↑'}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Panel */}
          <div className="flex flex-col gap-5">

            {/* Quick Links */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="font-semibold text-white text-sm">{t('services')}</h2>
              </div>
              <div className="p-3 space-y-1">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-3 p-2.5 rounded-xl transition-colors group hover:bg-white/[0.04]"
                  >
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: link.bg }}>
                      {link.icon}
                    </div>
                    <span className="text-slate-300 text-sm group-hover:text-white transition-colors">{link.label}</span>
                    <span className="ms-auto text-slate-700 text-xs">→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Services */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <h2 className="font-semibold text-white text-sm">
                  {isAr ? 'خدمات CV Master' : 'CV Master Services'}
                </h2>
              </div>
              <div className="p-3 space-y-2">
                {services.map((s) => (
                  <div
                    key={s.name}
                    className="flex items-center gap-3 p-3 rounded-xl"
                    style={{ background: s.bg, border: `1px solid ${s.border}` }}
                  >
                    <span className="text-base leading-none">{s.emoji}</span>
                    <div className="min-w-0">
                      <p className="text-slate-200 text-xs font-medium truncate">{s.name}</p>
                      <p className="text-slate-600 text-xs truncate">{s.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AppShell>
  )
}
