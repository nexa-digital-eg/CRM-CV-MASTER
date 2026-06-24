'use client'

import { useState, useMemo, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useLocale } from 'next-intl'
import { darkStatusColors, sourceColors } from '@/lib/utils'

const ALL_STATUSES = [
  'new', 'contacted', 'service_identified', 'price_sent', 'waiting_response',
  'waiting_payment', 'proof_sent', 'payment_confirmed', 'in_progress',
  'delivered', 'not_completed', 'follow_up_later'
]

const ALL_SOURCES = [
  'whatsapp', 'messenger', 'facebook_ad', 'instagram', 'instagram_ad',
  'website', 'referral', 'other'
]

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  source: string | null
  service_interested: string | null
  offered_price: number | null
  next_follow_up: string | null
  notes: string | null
  ai_enabled: boolean
  created_at: string
}

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد',
  contacted: 'تم التواصل',
  service_identified: 'تحديد الخدمة',
  price_sent: 'إرسال السعر',
  waiting_response: 'انتظار الرد',
  waiting_payment: 'انتظار الدفع',
  proof_sent: 'إثبات مرسل',
  payment_confirmed: 'تأكيد الدفع',
  in_progress: 'جاري التنفيذ',
  delivered: 'تم التسليم',
  not_completed: 'لم يكتمل',
  follow_up_later: 'متابعة لاحقاً',
}

const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'واتساب',
  messenger: 'ماسنجر',
  facebook_ad: 'إعلان فيسبوك',
  instagram: 'انستجرام',
  instagram_ad: 'إعلان انستجرام',
  website: 'الموقع',
  referral: 'توصية',
  other: 'أخرى',
}

const BG = 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)'
const CARD = { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }
const INPUT_STYLE = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }
const MODAL_BG = { background: '#111827', borderColor: 'rgba(255,255,255,0.1)' }
const DROPDOWN_BG = { background: '#1a1f2e', borderColor: 'rgba(255,255,255,0.12)' }
const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 border focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all bg-transparent'

export default function ContactsClient({ contacts: init, userId }: { contacts: Contact[]; userId: string }) {
  const router = useRouter()
  const locale = useLocale()
  const [contacts, setContacts] = useState(init)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterSource, setFilterSource] = useState('all')
  const [quickFilter, setQuickFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '',
    status: 'new', source: 'whatsapp',
    service_interested: '', offered_price: '', notes: '', next_follow_up: ''
  })

  const quickFilters = [
    { key: 'all', label: 'الكل' },
    { key: 'today', label: 'اليوم' },
    { key: 'ads', label: 'من الإعلانات' },
    { key: 'waiting_payment', label: 'انتظار الدفع' },
    { key: 'followup', label: 'تحتاج متابعة' },
  ]

  const filtered = useMemo(() => {
    let cs = [...contacts]
    if (search) {
      const q = search.toLowerCase()
      cs = cs.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.phone?.includes(q) ?? false) ||
        (c.service_interested?.toLowerCase().includes(q) ?? false)
      )
    }
    if (filterStatus !== 'all') cs = cs.filter(c => c.status === filterStatus)
    if (filterSource !== 'all') cs = cs.filter(c => c.source === filterSource)
    if (quickFilter === 'today') {
      const today = new Date().toDateString()
      cs = cs.filter(c => new Date(c.created_at).toDateString() === today)
    } else if (quickFilter === 'ads') {
      cs = cs.filter(c => c.source === 'facebook_ad' || c.source === 'instagram_ad')
    } else if (quickFilter === 'waiting_payment') {
      cs = cs.filter(c => c.status === 'waiting_payment')
    } else if (quickFilter === 'followup') {
      const now = new Date()
      now.setHours(23, 59, 59, 999)
      cs = cs.filter(c => c.next_follow_up && new Date(c.next_follow_up) <= now)
    }
    return cs
  }, [contacts, search, filterStatus, filterSource, quickFilter])

  const handleStatusChange = async (contactId: string, newStatus: string) => {
    setOpenStatusId(null)
    const supabase = createClient()
    await supabase.from('contacts').update({ status: newStatus }).eq('id', contactId)
    setContacts(cs => cs.map(c => c.id === contactId ? { ...c, status: newStatus } : c))
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('contacts').insert({
      name: form.name.trim(),
      phone: form.phone || null,
      email: form.email || null,
      company: form.company || null,
      status: form.status,
      source: form.source,
      service_interested: form.service_interested || null,
      offered_price: form.offered_price ? parseFloat(form.offered_price) : null,
      notes: form.notes || null,
      next_follow_up: form.next_follow_up || null,
      user_id: userId,
      ai_enabled: true
    }).select().single()
    if (data) {
      setContacts(prev => [data, ...prev])
      setShowModal(false)
      setForm({ name: '', phone: '', email: '', company: '', status: 'new', source: 'whatsapp', service_interested: '', offered_price: '', notes: '', next_follow_up: '' })
    }
    setSaving(false)
  }

  useEffect(() => {
    if (!openStatusId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Element
      if (!target.closest('[data-status-dropdown]')) setOpenStatusId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openStatusId])

  return (
    <div className="min-h-screen p-6" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">جهات الاتصال</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {filtered.length !== contacts.length
              ? `${filtered.length} من ${contacts.length}`
              : contacts.length} جهة اتصال
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          إضافة جهة اتصال
        </button>
      </div>

      {/* Quick filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        {quickFilters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setQuickFilter(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              quickFilter === key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={quickFilter !== key ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search + dropdowns */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className={inputCls + ' pr-10'}
            style={INPUT_STYLE}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className={inputCls}
          style={{ ...INPUT_STYLE, width: 'auto', minWidth: 150 }}
        >
          <option value="all">كل الحالات</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select
          value={filterSource}
          onChange={e => setFilterSource(e.target.value)}
          className={inputCls}
          style={{ ...INPUT_STYLE, width: 'auto', minWidth: 140 }}
        >
          <option value="all">كل المصادر</option>
          {ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={CARD}>
        {!filtered.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-14 h-14 mb-3 opacity-25">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-sm font-medium">لا توجد جهات اتصال</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {['الاسم / الهاتف', 'الخدمة / المصدر', 'الحالة', 'السعر', 'المتابعة', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const fu = c.next_follow_up ? new Date(c.next_follow_up) : null
                  const now = new Date()
                  const isOverdue = fu && fu < now
                  const isToday = fu && fu.toDateString() === now.toDateString()
                  return (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/${locale}/contacts/${c.id}`)}
                      className="border-b cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(255,255,255,0.04)', animationDelay: `${i * 20}ms`, animation: 'fadeInUp .3s ease both' }}
                    >
                      {/* Name + Phone */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200 whitespace-nowrap">{c.name}</p>
                            {c.phone && <p className="text-xs text-slate-500 font-mono">{c.phone}</p>}
                          </div>
                        </div>
                      </td>

                      {/* Service + Source */}
                      <td className="px-5 py-3.5">
                        <p className="text-slate-300 text-sm truncate max-w-[160px]">{c.service_interested ?? '—'}</p>
                        {c.source && (
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-lg mt-0.5 ${sourceColors[c.source] ?? 'bg-slate-500/15 text-slate-400'}`}>
                            {SOURCE_LABELS[c.source] ?? c.source}
                          </span>
                        )}
                      </td>

                      {/* Status - clickable dropdown */}
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative" data-status-dropdown>
                          <button
                            onClick={() => setOpenStatusId(openStatusId === c.id ? null : c.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${darkStatusColors[c.status] ?? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'}`}
                          >
                            {STATUS_LABELS[c.status] ?? c.status}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 shrink-0">
                              <polyline points="6 9 12 15 18 9"/>
                            </svg>
                          </button>
                          {openStatusId === c.id && (
                            <div
                              className="absolute z-30 top-full mt-1 rounded-xl shadow-2xl py-1.5 min-w-[190px] border"
                              style={DROPDOWN_BG}
                              data-status-dropdown
                            >
                              {ALL_STATUSES.map(s => (
                                <button
                                  key={s}
                                  onClick={() => handleStatusChange(c.id, s)}
                                  className={`w-full text-start px-3.5 py-1.5 text-xs hover:bg-white/5 transition-colors flex items-center gap-2 ${c.status === s ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}
                                >
                                  {c.status === s && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                                  {STATUS_LABELS[s]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Price */}
                      <td className="px-5 py-3.5 text-slate-300 text-sm whitespace-nowrap">
                        {c.offered_price != null
                          ? `${c.offered_price.toLocaleString('ar-EG')} ج.م`
                          : <span className="text-slate-600">—</span>}
                      </td>

                      {/* Follow-up */}
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {fu ? (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-lg ${
                            isOverdue ? 'bg-red-500/15 text-red-400' :
                            isToday ? 'bg-amber-500/15 text-amber-400' :
                            'text-slate-500'
                          }`}>
                            {fu.toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : <span className="text-slate-700 text-xs">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/${locale}/contacts/${c.id}`)}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                          title="عرض الملف الشخصي"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="rounded-2xl border w-full max-w-lg max-h-[90vh] overflow-y-auto"
            style={MODAL_BG}
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b flex items-center justify-between sticky top-0" style={{ background: '#111827', borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="text-lg font-bold text-white">إضافة جهة اتصال</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors p-1">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">الاسم *</label>
                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className={inputCls} style={INPUT_STYLE} placeholder="الاسم الكامل" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">الهاتف</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE} placeholder="01xxxxxxxxx" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">البريد الإلكتروني</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE} placeholder="example@mail.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">الحالة</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE}>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">المصدر</label>
                  <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE}>
                    {ALL_SOURCES.map(s => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">الخدمة المطلوبة</label>
                <input type="text" value={form.service_interested} onChange={e => setForm(f => ({ ...f, service_interested: e.target.value }))}
                  className={inputCls} style={INPUT_STYLE} placeholder="مثال: تصميم موقع، CV، AI Sales Agent..." />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">السعر المعروض (ج.م)</label>
                  <input type="number" value={form.offered_price} onChange={e => setForm(f => ({ ...f, offered_price: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">موعد المتابعة</label>
                  <input type="date" value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={inputCls + ' resize-none'} style={INPUT_STYLE} rows={3} placeholder="ملاحظات إضافية..." />
              </div>
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-lg shadow-indigo-500/20"
              >
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-all border"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
