'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { darkStatusColors, sourceColors } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد', contacted: 'تم التواصل', service_identified: 'تحديد الخدمة',
  price_sent: 'إرسال السعر', waiting_response: 'انتظار الرد',
  waiting_payment: 'انتظار الدفع', proof_sent: 'إثبات مرسل',
  payment_confirmed: 'تأكيد الدفع', in_progress: 'جاري التنفيذ',
  delivered: 'تم التسليم', not_completed: 'لم يكتمل', follow_up_later: 'متابعة لاحقاً',
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'واتساب', messenger: 'ماسنجر', facebook_ad: 'إعلان فيسبوك',
  instagram: 'انستجرام', instagram_ad: 'إعلان انستجرام',
  website: 'الموقع', referral: 'توصية', other: 'أخرى',
}

type Contact = {
  id: string; name: string; phone: string | null; status: string
  source: string | null; service_interested: string | null; next_follow_up: string
}

const BG = 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)'
const CARD = { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }

export default function FollowupsClient({
  contacts: init, userId, locale
}: {
  contacts: Contact[]; userId: string; locale: string
}) {
  const router = useRouter()
  const [contacts, setContacts] = useState(init)

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1)
  const dayAfter = new Date(today); dayAfter.setDate(today.getDate() + 2)

  const overdue = contacts.filter(c => new Date(c.next_follow_up) < today)
  const todayList = contacts.filter(c => {
    const d = new Date(c.next_follow_up); d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })
  const tomorrowList = contacts.filter(c => {
    const d = new Date(c.next_follow_up); d.setHours(0, 0, 0, 0)
    return d.getTime() === tomorrow.getTime()
  })
  const upcoming = contacts.filter(c => new Date(c.next_follow_up) >= dayAfter)

  const handleMarkDone = async (id: string) => {
    const supabase = createClient()
    await supabase.from('contacts').update({ next_follow_up: null }).eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
  }

  const handleSnooze = async (id: string) => {
    const supabase = createClient()
    const snoozeDate = new Date(); snoozeDate.setDate(snoozeDate.getDate() + 1)
    const dateStr = snoozeDate.toISOString().split('T')[0]
    await supabase.from('contacts').update({ next_follow_up: dateStr }).eq('id', id)
    setContacts(cs => cs.map(c => c.id === id ? { ...c, next_follow_up: dateStr } : c))
  }

  const ContactCard = ({ c, accent }: { c: Contact; accent: string }) => (
    <div className="rounded-2xl border p-4 flex items-center gap-4" style={CARD}>
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
        {c.name.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => router.push(`/${locale}/contacts/${c.id}`)}
            className="font-semibold text-slate-200 hover:text-white transition-colors text-sm"
          >
            {c.name}
          </button>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${darkStatusColors[c.status] ?? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'}`}>
            {STATUS_LABELS[c.status] ?? c.status}
          </span>
        </div>
        {c.phone && <p className="text-xs text-slate-500 font-mono mt-0.5">{c.phone}</p>}
        {c.service_interested && <p className="text-xs text-slate-400 mt-0.5 truncate">{c.service_interested}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {c.phone && (
          <a
            href={`https://wa.me/${c.phone.replace(/\D/g, '')}`}
            target="_blank" rel="noopener noreferrer"
            className="p-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
            title="فتح واتساب"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
          </a>
        )}
        <button
          onClick={() => handleSnooze(c.id)}
          className="p-2 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 transition-colors"
          title="تأجيل يوم"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
        <button
          onClick={() => handleMarkDone(c.id)}
          className="p-2 rounded-xl bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-colors"
          title="تم المتابعة"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </button>
      </div>
    </div>
  )

  const Section = ({ title, list, accent, emptyMsg }: { title: string; list: Contact[]; accent: string; emptyMsg: string }) => (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <h2 className={`text-sm font-bold uppercase tracking-widest ${accent}`}>{title}</h2>
        {list.length > 0 && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${accent} bg-current/10`}>{list.length}</span>
        )}
      </div>
      {list.length === 0 ? (
        <p className="text-slate-600 text-sm py-4">{emptyMsg}</p>
      ) : (
        <div className="space-y-3">
          {list.map(c => <ContactCard key={c.id} c={c} accent={accent} />)}
        </div>
      )}
    </div>
  )

  return (
    <div className="min-h-screen p-6" style={{ background: BG }}>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">المتابعات</h1>
        <p className="text-slate-400 text-sm mt-0.5">{contacts.length} متابعة مجدولة</p>
      </div>

      <div className="max-w-2xl space-y-10">
        <Section title="متأخر" list={overdue} accent="text-red-400" emptyMsg="لا توجد متابعات متأخرة ✓" />
        <Section title="اليوم" list={todayList} accent="text-amber-400" emptyMsg="لا توجد متابعات اليوم" />
        <Section title="غداً" list={tomorrowList} accent="text-blue-400" emptyMsg="لا توجد متابعات غداً" />
        <Section title="قادم" list={upcoming} accent="text-slate-400" emptyMsg="لا توجد متابعات قادمة" />
      </div>
    </div>
  )
}
