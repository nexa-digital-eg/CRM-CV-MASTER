'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { statusColors, formatDate } from '@/lib/utils'

type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  status: string
  created_at: string
}

type T = {
  title: string
  addContact: string
  name: string
  email: string
  phone: string
  company: string
  status: string
  createdAt: string
  noContacts: string
  save: string
  cancel: string
  status_lead: string
  status_prospect: string
  status_client: string
  status_inactive: string
}

export default function ContactsClient({
  contacts: initialContacts,
  userId,
  t
}: {
  contacts: Contact[]
  userId: string
  t: T
}) {
  const [contacts, setContacts] = useState(initialContacts)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', status: 'lead' })
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const statusLabels: Record<string, string> = {
    lead: t.status_lead,
    prospect: t.status_prospect,
    client: t.status_client,
    inactive: t.status_inactive
  }

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('contacts')
      .insert({ ...form, user_id: userId })
      .select()
      .single()

    if (data) {
      setContacts([data, ...contacts])
      setShowModal(false)
      setForm({ name: '', email: '', phone: '', company: '', status: 'lead' })
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          + {t.addContact}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {!contacts.length ? (
          <p className="p-8 text-center text-slate-400">{t.noContacts}</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {[t.name, t.phone, t.company, t.status, t.createdAt].map(h => (
                  <th key={h} className="px-4 py-3 text-start font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contacts.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{c.company ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] ?? ''}`}>
                      {statusLabels[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold mb-4">{t.addContact}</h2>

            <div className="space-y-3">
              {[
                { key: 'name', label: t.name, type: 'text', required: true },
                { key: 'phone', label: t.phone, type: 'tel', required: false },
                { key: 'email', label: t.email, type: 'email', required: false },
                { key: 'company', label: t.company, type: 'text', required: false }
              ].map(({ key, label, type, required }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
                  <input
                    type={type}
                    required={required}
                    value={form[key as keyof typeof form]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{t.status}</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(statusLabels).map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSave}
                disabled={saving || !form.name}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {t.save}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 border border-slate-200 text-slate-600 rounded-lg py-2 text-sm hover:bg-slate-50 transition-colors"
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
