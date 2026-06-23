'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { statusColors, formatDate } from '@/lib/utils'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  ai_enabled: boolean | null
  created_at: string
}

type T = {
  title: string; addContact: string; name: string; email: string
  phone: string; company: string; status: string; createdAt: string
  noContacts: string; save: string; cancel: string
  status_lead: string; status_prospect: string; status_client: string; status_inactive: string
}

function AIToggle({ contactId, initial }: { contactId: string; initial: boolean }) {
  const [enabled, setEnabled] = useState(initial)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    await supabase.from('contacts').update({ ai_enabled: !enabled }).eq('id', contactId)
    setEnabled(e => !e)
    setLoading(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enabled ? 'الذكاء الاصطناعي شغّال — اضغط لإيقافه' : 'الذكاء الاصطناعي متوقف — اضغط لتشغيله'}
      className={`relative inline-flex h-6 w-11 items-center rounded-full toggle-track transition-colors disabled:opacity-60 ${enabled ? 'bg-indigo-600' : 'bg-slate-200'}`}
    >
      <span className={`toggle-thumb inline-block h-4 w-4 rounded-full bg-white shadow-sm ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function ContactsClient({ contacts: init, userId, t }: { contacts: Contact[]; userId: string; t: T }) {
  const [contacts, setContacts] = useState(init)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'lead' })
  const [saving, setSaving] = useState(false)

  const statusLabels: Record<string, string> = {
    lead: t.status_lead, prospect: t.status_prospect,
    client: t.status_client, inactive: t.status_inactive
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase.from('contacts')
      .insert({ ...form, user_id: userId, ai_enabled: true })
      .select().single()
    if (data) { setContacts([data, ...contacts]); setShowModal(false); setForm({ name: '', email: '', phone: '', company: '', status: 'lead' }) }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">{contacts.length} جهة اتصال</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/25"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          {t.addContact}
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden crm-table">
        {!contacts.length ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-14 h-14 mb-3 opacity-30">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <p className="text-sm font-medium">{t.noContacts}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {[t.name, t.phone, t.company, t.status, 'AI Agent', t.createdAt].map(h => (
                  <th key={h} className="px-5 py-3.5 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contacts.map((c, i) => (
                <tr
                  key={c.id}
                  className="hover:bg-slate-50/70 transition-colors"
                  style={{ animationDelay: `${i * 30}ms`, animation: 'fadeInUp .35s ease both' }}
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{c.name}</p>
                        {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{c.phone ?? '—'}</td>
                  <td className="px-5 py-3.5 text-slate-600">{c.company ?? '—'}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[c.status] ?? ''}`}>
                      {statusLabels[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <AIToggle contactId={c.id} initial={c.ai_enabled !== false} />
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="modal-content bg-white rounded-3xl shadow-2xl w-full max-w-md">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{t.addContact}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {[
                { key: 'name', label: t.name, type: 'text', required: true },
                { key: 'phone', label: t.phone, type: 'tel', required: false },
                { key: 'email', label: t.email, type: 'email', required: false },
                { key: 'company', label: t.company, type: 'text', required: false }
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">{t.status}</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400 transition-all"
                >
                  {Object.entries(statusLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="btn-primary flex-1 bg-indigo-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-600/20"
              >
                {saving ? '...' : t.save}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 rounded-xl py-2.5 text-sm hover:bg-slate-50 transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
