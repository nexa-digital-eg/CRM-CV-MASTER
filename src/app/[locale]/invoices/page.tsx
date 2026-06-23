import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { statusColors, formatCurrency, formatDate } from '@/lib/utils'

export default async function InvoicesPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('invoices')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id,number,total,currency,status,due_date,contacts(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const statusLabels: Record<string, string> = {
    draft: t('draft'),
    sent: t('sent'),
    paid: t('paid'),
    overdue: t('overdue')
  }

  return (
    <AppShell>
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('title')}</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {!invoices?.length ? (
            <p className="p-8 text-center text-slate-400">{t('noInvoices')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[t('number'), t('contact'), t('total'), t('dueDate'), t('status')].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{inv.number}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.contacts ? (Array.isArray(inv.contacts) ? (inv.contacts as { name: string }[])[0]?.name : (inv.contacts as unknown as { name: string }).name) : '—'}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {formatCurrency(inv.total ?? 0, inv.currency ?? 'SAR')}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {inv.due_date ? formatDate(inv.due_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[inv.status ?? 'draft'] ?? ''}`}>
                        {statusLabels[inv.status ?? 'draft'] ?? inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppShell>
  )
}
