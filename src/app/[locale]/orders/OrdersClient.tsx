'use client'

import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { darkStatusColors } from '@/lib/utils'

const ALL_ORDER_STATUSES = ['pending', 'in_progress', 'review', 'delivered', 'completed', 'cancelled', 'refunded']

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  in_progress: 'جاري التنفيذ',
  review: 'مراجعة',
  delivered: 'تم التسليم',
  completed: 'مكتمل',
  cancelled: 'ملغي',
  refunded: 'مسترد',
}

type Order = {
  id: string
  order_number: string | null
  service: string | null
  price: number | null
  status: string
  due_date: string | null
  notes: string | null
  created_at: string
  contact_id: string
  contacts: { name: string; phone: string | null } | null
}

type Contact = { id: string; name: string }

const BG = 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)'
const CARD = { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.07)' }
const INPUT_STYLE = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }
const MODAL_BG = { background: '#111827', borderColor: 'rgba(255,255,255,0.1)' }
const DROPDOWN_BG = { background: '#1a1f2e', borderColor: 'rgba(255,255,255,0.12)' }
const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 border focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

function nextOrderNumber(orders: Order[]) {
  const nums = orders.map(o => parseInt(o.order_number ?? '0', 10)).filter(n => !isNaN(n))
  return String((Math.max(0, ...nums) + 1)).padStart(4, '0')
}

export default function OrdersClient({
  orders: init, contacts, userId, locale
}: {
  orders: Order[]; contacts: Contact[]; userId: string; locale: string
}) {
  const router = useRouter()
  const [orders, setOrders] = useState(init)
  const [filterStatus, setFilterStatus] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [openStatusId, setOpenStatusId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    contact_id: '', service: '', price: '', status: 'pending', due_date: '', notes: ''
  })

  const filtered = useMemo(() =>
    filterStatus === 'all' ? orders : orders.filter(o => o.status === filterStatus),
    [orders, filterStatus]
  )

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOpenStatusId(null)
    const supabase = createClient()
    await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    setOrders(os => os.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
  }

  const handleSave = async () => {
    if (!form.contact_id || !form.service.trim()) return
    setSaving(true)
    const supabase = createClient()
    const orderNumber = nextOrderNumber(orders)
    const { data } = await supabase.from('orders').insert({
      user_id: userId,
      contact_id: form.contact_id,
      order_number: orderNumber,
      service: form.service.trim(),
      price: form.price ? parseFloat(form.price) : null,
      status: form.status,
      due_date: form.due_date || null,
      notes: form.notes || null,
    }).select('*, contacts(name, phone)').single()
    if (data) {
      setOrders(os => [data, ...os])
      setShowModal(false)
      setForm({ contact_id: '', service: '', price: '', status: 'pending', due_date: '', notes: '' })
    }
    setSaving(false)
  }

  // Status counts for filter pills
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: orders.length }
    orders.forEach(o => { counts[o.status] = (counts[o.status] ?? 0) + 1 })
    return counts
  }, [orders])

  return (
    <div className="min-h-screen p-6" style={{ background: BG }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">الطلبات</h1>
          <p className="text-slate-400 text-sm mt-0.5">{filtered.length} طلب</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          إضافة طلب
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-5">
        {['all', ...ALL_ORDER_STATUSES].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
              filterStatus === s
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/25'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            style={filterStatus !== s ? { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } : undefined}
          >
            {s === 'all' ? 'الكل' : ORDER_STATUS_LABELS[s]}
            {(statusCounts[s] ?? 0) > 0 && (
              <span className={`text-xs px-1 py-0.5 rounded-full ${filterStatus === s ? 'bg-white/20' : 'bg-white/10'}`}>
                {statusCounts[s]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border overflow-hidden" style={CARD}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-600">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mb-3 opacity-25">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            <p className="text-sm">لا توجد طلبات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
                  {['رقم الطلب', 'العميل', 'الخدمة', 'الحالة', 'السعر', 'تاريخ التسليم', ''].map((h, i) => (
                    <th key={i} className="px-5 py-3.5 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((o, i) => {
                  const isDueSoon = o.due_date && new Date(o.due_date) <= new Date(Date.now() + 3 * 86400000)
                  const isOverdue = o.due_date && new Date(o.due_date) < new Date()
                  return (
                    <tr
                      key={o.id}
                      className="border-b transition-colors hover:bg-white/[0.02]"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-5 py-3.5">
                        <span className="text-slate-400 font-mono text-xs">#{o.order_number ?? '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => router.push(`/${locale}/contacts`)}
                          className="text-slate-200 hover:text-white transition-colors text-sm font-medium"
                        >
                          {o.contacts?.name ?? '—'}
                        </button>
                        {o.contacts?.phone && <p className="text-xs text-slate-600 font-mono">{o.contacts.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-sm max-w-[180px]">
                        <p className="truncate">{o.service ?? '—'}</p>
                      </td>
                      <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            onClick={() => setOpenStatusId(openStatusId === o.id ? null : o.id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${darkStatusColors[o.status] ?? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'}`}
                          >
                            {ORDER_STATUS_LABELS[o.status] ?? o.status}
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5 shrink-0"><polyline points="6 9 12 15 18 9"/></svg>
                          </button>
                          {openStatusId === o.id && (
                            <div className="absolute z-20 top-full mt-1 rounded-xl shadow-2xl py-1.5 min-w-[160px] border" style={DROPDOWN_BG}>
                              {ALL_ORDER_STATUSES.map(s => (
                                <button key={s} onClick={() => handleStatusChange(o.id, s)}
                                  className={`w-full text-start px-3.5 py-1.5 text-xs hover:bg-white/5 transition-colors ${o.status === s ? 'text-indigo-400 font-semibold' : 'text-slate-300'}`}>
                                  {ORDER_STATUS_LABELS[s]}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 text-sm whitespace-nowrap">
                        {o.price != null ? `${o.price.toLocaleString('ar-EG')} ج.م` : '—'}
                      </td>
                      <td className="px-5 py-3.5 whitespace-nowrap">
                        {o.due_date ? (
                          <span className={`text-xs font-medium ${isOverdue && o.status !== 'completed' && o.status !== 'delivered' ? 'text-red-400' : isDueSoon ? 'text-amber-400' : 'text-slate-400'}`}>
                            {new Date(o.due_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
                          </span>
                        ) : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {o.notes && (
                          <span className="text-xs text-slate-600 truncate max-w-[100px] block" title={o.notes}>{o.notes}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Order Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="rounded-2xl border w-full max-w-md" style={MODAL_BG} onClick={e => e.stopPropagation()}>
            <div className="px-6 py-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="text-lg font-bold text-white">إضافة طلب</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">العميل *</label>
                <select value={form.contact_id} onChange={e => setForm(f => ({ ...f, contact_id: e.target.value }))}
                  className={inputCls} style={INPUT_STYLE}>
                  <option value="">اختر العميل...</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">الخدمة *</label>
                <input type="text" value={form.service} onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
                  className={inputCls} style={INPUT_STYLE} placeholder="اسم الخدمة" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">السعر (ج.م)</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE} placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">تاريخ التسليم</label>
                  <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className={inputCls} style={INPUT_STYLE} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">الحالة</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className={inputCls} style={INPUT_STYLE}>
                  {ALL_ORDER_STATUSES.map(s => <option key={s} value={s}>{ORDER_STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wide">ملاحظات</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className={inputCls + ' resize-none'} style={INPUT_STYLE} rows={2} placeholder="ملاحظات..." />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={handleSave} disabled={saving || !form.contact_id || !form.service.trim()}
                className="flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-500 disabled:opacity-50 transition-all">
                {saving ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl py-2.5 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 border transition-all"
                style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
