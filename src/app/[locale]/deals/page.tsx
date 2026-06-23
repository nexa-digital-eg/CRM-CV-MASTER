import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { statusColors, formatCurrency } from '@/lib/utils'

type Deal = {
  id: string
  title: string
  value: number | null
  currency: string | null
  status: string
  contacts: { name: string } | { name: string }[] | null
}

const COLUMNS = ['new', 'contacted', 'proposal', 'won', 'lost']

export default async function DealsPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('deals')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: deals } = await supabase
    .from('deals')
    .select('id,title,value,currency,status,contacts(name)')
    .eq('user_id', user.id)
    .order('position')

  const byStatus = COLUMNS.reduce((acc, col) => {
    acc[col] = (deals ?? []).filter(d => d.status === col)
    return acc
  }, {} as Record<string, Deal[]>)

  const colLabels: Record<string, string> = {
    new: t('new'),
    contacted: t('contacted'),
    proposal: t('proposal'),
    won: t('won'),
    lost: t('lost')
  }

  return (
    <AppShell>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('title')}</h1>

        <div className="flex gap-4 overflow-x-auto pb-4">
          {COLUMNS.map(col => (
            <div key={col} className="min-w-56 w-56 shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-700">{colLabels[col]}</h2>
                <span className="text-xs bg-slate-100 text-slate-500 rounded-full px-2 py-0.5">
                  {byStatus[col]?.length ?? 0}
                </span>
              </div>

              <div className="space-y-2">
                {byStatus[col]?.map(deal => (
                  <div key={deal.id} className="bg-white rounded-xl p-3 shadow-sm border border-slate-100">
                    <p className="text-sm font-medium text-slate-800 leading-snug">{deal.title}</p>
                    {deal.contacts && (
                      <p className="text-xs text-slate-500 mt-1">
                        {Array.isArray(deal.contacts) ? deal.contacts[0]?.name : deal.contacts.name}
                      </p>
                    )}
                    {deal.value != null && (
                      <p className="text-sm font-semibold text-indigo-600 mt-2">
                        {formatCurrency(deal.value, deal.currency ?? 'SAR')}
                      </p>
                    )}
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[col] ?? ''}`}>
                      {colLabels[col]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}
