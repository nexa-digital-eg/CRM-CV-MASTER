'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { darkStatusColors, sourceColors } from '@/lib/utils'

const ALL_STATUSES = [
  'new', 'contacted', 'service_identified', 'price_sent', 'waiting_response',
  'waiting_payment', 'proof_sent', 'payment_confirmed', 'in_progress',
  'delivered', 'not_completed', 'follow_up_later'
]

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

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', in_progress: 'جاري التنفيذ', review: 'مراجعة',
  delivered: 'تم التسليم', completed: 'مكتمل', cancelled: 'ملغي', refunded: 'مسترد',
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار', proof_submitted: 'إثبات مرسل',
  confirmed: 'مؤكد', rejected: 'مرفوض', refunded: 'مسترد',
}

const BG = 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)'
const CARD = { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }
const INPUT_STYLE = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }
const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 border focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

type Contact = Record<string, unknown> & {
  id: string; name: string; phone: string | null; email: string | null
  company: string | null; status: string; source: string | null
  service_interested: string | null; offered_price: number | null
  next_follow_up: string | null; notes: string | null
  ai_enabled: boolean; created_at: string
}
type Note = { id: string; body: string; pinned: boolean; created_at: string }
type TimelineEvent = { id: string; type: string; description: string; created_at: string }
type Order = { id: string; order_number: string | null; service: string | null; price: number | null; status: string; due_date: string | null; created_at: string }
type Payment = { id: string; amount: number | null; currency: string; method: string | null; status: string; created_at: string }
type Message = { id: string; direction: string; message: string; ai_message: boolean; created_at: string }

type Tab = 'notes' | 'timeline' | 'orders' | 'payments' | 'chat'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'الآن'
  if (m < 60) return `منذ ${m} دقيقة`
  const h = Math.floor(m / 60)
  if (h < 24) return `منذ ${h} ساعة`
  const d = Math.floor(h / 24)
  if (d < 30) return `منذ ${d} يوم`
  return new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
}

export default function ContactProfileClient({
  contact: init, notes: initNotes, timeline: initTimeline,
  orders, payments, messages, userId, locale
}: {
  contact: Contact; notes: Note[]; timeline: TimelineEvent[]
  orders: Order[]; payments: Payment[]; messages: Message[]
  userId: string; locale: string
}) {
  const router = useRouter()
  const [contact, setContact] = useState(init)
  const [notes, setNotes] = useState(initNotes)
  const [timeline, setTimeline] = useState(initTimeline)
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [noteText, setNoteText] = useState('')
  const [addingNote, setAddingNote] = useState(false)
  const [aiEnabled, setAiEnabled] = useState(init.ai_enabled)
  const [togglingAi, setTogglingAi] = useState(false)
  const [editingPrice, setEditingPrice] = useState(false)
  const [priceInput, setPriceInput] = useState(String(init.offered_price ?? ''))

  const handleStatusChange = async (newStatus: string) => {
    const supabase = createClient()
    await supabase.from('contacts').update({ status: newStatus }).eq('id', contact.id)
    const label = STATUS_LABELS[newStatus] ?? newStatus
    const { data: ev } = await supabase.from('timeline_events').insert({
      contact_id: contact.id, user_id: userId,
      type: 'status_change', description: `تغيير الحالة إلى: ${label}`
    }).select().single()
    setContact(c => ({ ...c, status: newStatus }))
    if (ev) setTimeline(t => [ev, ...t])
  }

  const handleAddNote = async () => {
    if (!noteText.trim()) return
    setAddingNote(true)
    const supabase = createClient()
    const { data: note } = await supabase.from('contact_notes').insert({
      contact_id: contact.id, user_id: userId, body: noteText.trim()
    }).select().single()
    const { data: ev } = await supabase.from('timeline_events').insert({
      contact_id: contact.id, user_id: userId, type: 'note', description: 'تمت إضافة ملاحظة'
    }).select().single()
    if (note) setNotes(n => [note, ...n])
    if (ev) setTimeline(t => [ev, ...t])
    setNoteText('')
    setAddingNote(false)
  }

  const handleToggleAi = async () => {
    setTogglingAi(true)
    const supabase = createClient()
    await supabase.from('contacts').update({ ai_enabled: !aiEnabled }).eq('id', contact.id)
    setAiEnabled(v => !v)
    setTogglingAi(false)
  }

  const handleSavePrice = async () => {
    const supabase = createClient()
    const price = priceInput ? parseFloat(priceInput) : null
    await supabase.from('contacts').update({ offered_price: price }).eq('id', contact.id)
    setContact(c => ({ ...c, offered_price: price }))
    setEditingPrice(false)
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'notes', label: 'الملاحظات', count: notes.length },
    { key: 'chat', label: 'واتساب', count: messages.length },
    { key: 'timeline', label: 'السجل', count: timeline.length },
    { key: 'orders', label: 'الطلبات', count: orders.length },
    { key: 'payments', label: 'المدفوعات', count: payments.length },
  ]

  return (
    <div className="min-h-screen p-6" style={{ background: BG }}>
      {/* Back button */}
      <button
        onClick={() => router.push(`/${locale}/contacts`)}
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-6 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <polyline points="15 18 9 12 15 6"/>
        </svg>
        رجوع
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Contact info */}
        <div className="space-y-4">
          {/* Identity card */}
          <div className="rounded-2xl border p-6" style={CARD}>
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold mb-3">
                {contact.name.charAt(0).toUpperCase()}
              </div>
              <h1 className="text-xl font-bold text-white">{contact.name}</h1>
              {contact.source && (
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full mt-1.5 ${sourceColors[contact.source] ?? 'bg-slate-500/15 text-slate-400'}`}>
                  {SOURCE_LABELS[contact.source] ?? contact.source}
                </span>
              )}
            </div>

            <div className="space-y-3">
              {contact.phone && (
                <a
                  href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-green-500/15 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div className="text-start">
                    <p className="text-xs text-slate-500">واتساب</p>
                    <p className="text-slate-300 text-sm font-mono group-hover:text-white">{contact.phone}</p>
                  </div>
                </a>
              )}

              {contact.email && (
                <div className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-blue-400">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">البريد الإلكتروني</p>
                    <p className="text-slate-300 text-sm">{contact.email}</p>
                  </div>
                </div>
              )}

              {contact.service_interested && (
                <div className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-violet-400">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">الخدمة المطلوبة</p>
                    <p className="text-slate-300 text-sm">{contact.service_interested}</p>
                  </div>
                </div>
              )}

              {/* Offered price */}
              <div className="flex items-center gap-3 p-3 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-amber-400">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">السعر المعروض</p>
                  {editingPrice ? (
                    <div className="flex items-center gap-2 mt-0.5">
                      <input type="number" value={priceInput} onChange={e => setPriceInput(e.target.value)}
                        className="w-24 rounded-lg px-2 py-1 text-sm text-slate-200 border focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        style={INPUT_STYLE} autoFocus />
                      <button onClick={handleSavePrice} className="text-xs text-indigo-400 hover:text-indigo-300">حفظ</button>
                      <button onClick={() => setEditingPrice(false)} className="text-xs text-slate-500 hover:text-slate-300">إلغاء</button>
                    </div>
                  ) : (
                    <button onClick={() => setEditingPrice(true)} className="text-slate-300 text-sm hover:text-white transition-colors text-start">
                      {contact.offered_price != null ? `${contact.offered_price.toLocaleString('ar-EG')} ج.م` : '+ إضافة سعر'}
                    </button>
                  )}
                </div>
              </div>

              {contact.next_follow_up && (
                <div className="flex items-center gap-3 p-3 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-cyan-400">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">موعد المتابعة</p>
                    <p className="text-slate-300 text-sm">{new Date(contact.next_follow_up).toLocaleDateString('ar-EG', { weekday: 'short', month: 'long', day: 'numeric' })}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-xs text-slate-500 mb-1">تاريخ الإضافة</p>
              <p className="text-slate-400 text-sm">{new Date(contact.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          {/* Status change */}
          <div className="rounded-2xl border p-5" style={CARD}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">تغيير الحالة</p>
            <div className="grid grid-cols-1 gap-1.5">
              {ALL_STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`flex items-center gap-2 w-full text-start px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    contact.status === s
                      ? (darkStatusColors[s] ?? 'bg-indigo-500/15 text-indigo-300') + ' ring-1 ring-inset ring-current/30'
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                  }`}
                >
                  {contact.status === s && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />}
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* AI Toggle */}
          <div className="rounded-2xl border p-5" style={CARD}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-200">الردود الآلية (AI)</p>
                <p className="text-xs text-slate-500 mt-0.5">{aiEnabled ? 'الذكاء الاصطناعي يرد تلقائياً' : 'متوقف — الردود يدوية'}</p>
              </div>
              <button
                onClick={handleToggleAi}
                disabled={togglingAi}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-60 ${aiEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${aiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right column: Tabs */}
        <div className="lg:col-span-2">
          {/* Tab bar */}
          <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.key ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
                {tab.count != null && tab.count > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Notes tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <div className="rounded-2xl border p-4" style={CARD}>
                <textarea
                  value={noteText}
                  onChange={e => setNoteText(e.target.value)}
                  placeholder="اكتب ملاحظة..."
                  className={inputCls + ' resize-none mb-3'}
                  style={INPUT_STYLE}
                  rows={3}
                />
                <button
                  onClick={handleAddNote}
                  disabled={addingNote || !noteText.trim()}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all"
                >
                  {addingNote ? 'جاري الحفظ...' : 'إضافة ملاحظة'}
                </button>
              </div>
              {notes.length === 0 ? (
                <p className="text-center text-slate-600 py-10 text-sm">لا توجد ملاحظات</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="rounded-2xl border p-4" style={CARD}>
                    <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">{note.body}</p>
                    <p className="text-xs text-slate-600 mt-2">{timeAgo(note.created_at)}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {/* WhatsApp chat tab */}
          {activeTab === 'chat' && (
            <div className="rounded-2xl border overflow-hidden" style={CARD}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-600">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 mb-3 opacity-30">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                  <p className="text-sm">لا توجد رسائل</p>
                </div>
              ) : (
                <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
                  {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                        msg.direction === 'outbound'
                          ? msg.ai_message
                            ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/25'
                            : 'bg-white/10 text-slate-200 border border-white/10'
                          : 'bg-green-600/20 text-green-200 border border-green-500/20'
                      }`}>
                        {msg.ai_message && <p className="text-xs text-indigo-400 mb-1 font-semibold">AI</p>}
                        <p className="leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-xs text-current/40 mt-1.5">{timeAgo(msg.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-2">
              {timeline.length === 0 ? (
                <p className="text-center text-slate-600 py-10 text-sm">لا توجد أحداث</p>
              ) : (
                timeline.map(ev => (
                  <div key={ev.id} className="flex gap-3 items-start rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-slate-300 text-sm">{ev.description}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{timeAgo(ev.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Orders tab */}
          {activeTab === 'orders' && (
            <div className="space-y-3">
              {orders.length === 0 ? (
                <p className="text-center text-slate-600 py-10 text-sm">لا توجد طلبات</p>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="rounded-2xl border p-4 flex items-center justify-between gap-4" style={CARD}>
                    <div>
                      <p className="text-slate-200 font-semibold text-sm">{order.service ?? 'خدمة غير محددة'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {order.order_number ? `#${order.order_number}` : ''}{order.due_date ? ` · تسليم ${new Date(order.due_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {order.price != null && <span className="text-slate-300 text-sm font-semibold">{order.price.toLocaleString('ar-EG')} ج.م</span>}
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${darkStatusColors[order.status] ?? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'}`}>
                        {ORDER_STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Payments tab */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <p className="text-center text-slate-600 py-10 text-sm">لا توجد مدفوعات</p>
              ) : (
                payments.map(payment => (
                  <div key={payment.id} className="rounded-2xl border p-4 flex items-center justify-between gap-4" style={CARD}>
                    <div>
                      <p className="text-slate-200 font-semibold text-sm">
                        {payment.amount != null ? `${payment.amount.toLocaleString('ar-EG')} ${payment.currency}` : 'مبلغ غير محدد'}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{payment.method ?? ''} · {timeAgo(payment.created_at)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${darkStatusColors[payment.status] ?? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'}`}>
                      {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
