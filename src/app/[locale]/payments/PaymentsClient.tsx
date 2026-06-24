'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { darkStatusColors } from '@/lib/utils'

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'قيد الانتظار',
  proof_submitted: 'إثبات مرسل',
  confirmed: 'مؤكد',
  rejected: 'مرفوض',
  refunded: 'مسترد',
}

type Payment = {
  id: string
  amount: number | null
  currency: string
  method: string | null
  status: string
  proof_url: string | null
  notes: string | null
  created_at: string
  contacts: { name: string; phone: string | null } | null
}

const BG = 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)'
const CARD = { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }
const INPUT_STYLE = { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#e2e8f0' }
const inputCls = 'w-full rounded-xl px-4 py-2.5 text-sm placeholder-slate-500 border focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'اليوم'
  if (d === 1) return 'أمس'
  if (d < 30) return `منذ ${d} يوم`
  return new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })
}

export default function PaymentsClient({
  payments: init, userId, locale
}: {
  payments: Payment[]; userId: string; locale: string
}) {
  const router = useRouter()
  const [payments, setPayments] = useState(init)
  const [activeTab, setActiveTab] = useState<'queue' | 'all'>('queue')

  const proofQueue = payments.filter(p => p.status === 'proof_submitted')
  const allPayments = payments

  const handleConfirm = async (id: string) => {
    const supabase = createClient()
    await supabase.from('payments').update({ status: 'confirmed', confirmed_by: userId, confirmed_at: new Date().toISOString() }).eq('id', id)
    setPayments(ps => ps.map(p => p.id === id ? { ...p, status: 'confirmed' } : p))
  }

  const handleReject = async (id: string) => {
    const supabase = createClient()
    await supabase.from('payments').update({ status: 'rejected' }).eq('id', id)
    setPayments(ps => ps.map(p => p.id === id ? { ...p, status: 'rejected' } : p))
  }

  const PaymentCard = ({ p }: { p: Payment }) => (
    <div className="rounded-2xl border p-5" style={CARD}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <button
            onClick={() => p.contacts && router.push(`/${locale}/contacts`)}
            className="font-semibold text-slate-200 hover:text-white transition-colors text-sm"
          >
            {p.contacts?.name ?? 'عميل غير معروف'}
          </button>
          {p.contacts?.phone && <p className="text-xs text-slate-500 font-mono mt-0.5">{p.contacts.phone}</p>}
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${darkStatusColors[p.status] ?? 'bg-slate-500/15 text-slate-300 border border-slate-500/25'}`}>
          {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
        </span>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <p className="text-xs text-slate-500">المبلغ</p>
          <p className="text-slate-200 font-bold text-lg">
            {p.amount != null ? `${p.amount.toLocaleString('ar-EG')} ${p.currency}` : '—'}
          </p>
        </div>
        {p.method && (
          <div>
            <p className="text-xs text-slate-500">طريقة الدفع</p>
            <p className="text-slate-300 text-sm">{p.method}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-slate-500">التاريخ</p>
          <p className="text-slate-400 text-sm">{timeAgo(p.created_at)}</p>
        </div>
      </div>

      {p.proof_url && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <a
            href={p.proof_url}
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            عرض إثبات الدفع
          </a>
        </div>
      )}

      {p.status === 'proof_submitted' && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => handleConfirm(p.id)}
            className="flex-1 bg-green-600/20 text-green-300 border border-green-500/30 rounded-xl py-2 text-sm font-semibold hover:bg-green-600/30 transition-all"
          >
            ✓ تأكيد الدفع
          </button>
          <button
            onClick={() => handleReject(p.id)}
            className="flex-1 bg-red-600/20 text-red-300 border border-red-500/30 rounded-xl py-2 text-sm font-semibold hover:bg-red-600/30 transition-all"
          >
            ✕ رفض
          </button>
        </div>
      )}

      {p.notes && (
        <p className="mt-3 text-xs text-slate-500 italic">{p.notes}</p>
      )}
    </div>
  )

  return (
    <div className="min-h-screen p-6" style={{ background: BG }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">المدفوعات</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {proofQueue.length > 0 && <span className="text-amber-400 font-semibold">{proofQueue.length} تحتاج مراجعة · </span>}
          {payments.length} إجمالي
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'queue' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          قائمة الإثباتات
          {proofQueue.length > 0 && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === 'queue' ? 'bg-white/20' : 'bg-amber-500/20 text-amber-400'}`}>
              {proofQueue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
        >
          جميع المدفوعات
        </button>
      </div>

      {activeTab === 'queue' && (
        <div className="max-w-2xl space-y-4">
          {proofQueue.length === 0 ? (
            <div className="text-center py-16 text-slate-600">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-3 opacity-30">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <p className="text-sm">لا توجد إثباتات في انتظار المراجعة</p>
            </div>
          ) : (
            proofQueue.map(p => <PaymentCard key={p.id} p={p} />)
          )}
        </div>
      )}

      {activeTab === 'all' && (
        <div className="max-w-2xl space-y-4">
          {allPayments.length === 0 ? (
            <p className="text-center text-slate-600 py-16 text-sm">لا توجد مدفوعات</p>
          ) : (
            allPayments.map(p => <PaymentCard key={p.id} p={p} />)
          )}
        </div>
      )}
    </div>
  )
}
