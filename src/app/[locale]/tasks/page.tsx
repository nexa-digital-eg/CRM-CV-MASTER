import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/layout/AppShell'
import { statusColors, formatDate } from '@/lib/utils'

export default async function TasksPage({
  params
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  const t = await getTranslations('tasks')
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/${locale}/login`)

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id,title,status,priority,due_date,contacts(name)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const statusLabels: Record<string, string> = {
    todo: t('todo'),
    in_progress: t('in_progress'),
    done: t('done')
  }

  const priorityLabels: Record<string, string> = {
    high: t('high'),
    medium: t('medium'),
    low: t('low')
  }

  return (
    <AppShell>
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">{t('title')}</h1>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {!tasks?.length ? (
            <p className="p-8 text-center text-slate-400">{t('noTasks')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {[t('taskTitle'), t('priority'), t('dueDate'), t('status')].map(h => (
                    <th key={h} className="px-4 py-3 text-start font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tasks.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{task.title}</p>
                      {task.contacts && (
                        <p className="text-xs text-slate-500 mt-0.5">{Array.isArray(task.contacts) ? (task.contacts as { name: string }[])[0]?.name : (task.contacts as unknown as { name: string }).name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[task.priority ?? 'medium'] ?? ''}`}>
                        {priorityLabels[task.priority ?? 'medium'] ?? task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {task.due_date ? formatDate(task.due_date) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status ?? 'todo'] ?? ''}`}>
                        {statusLabels[task.status ?? 'todo'] ?? task.status}
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
