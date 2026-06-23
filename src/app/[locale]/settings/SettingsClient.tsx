'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Settings = {
  id?: string
  user_id?: string
  app_name?: string
  whatsapp_number?: string
  n8n_webhook_url?: string
  locale?: string
  currency?: string
}

type T = {
  title: string
  appName: string
  whatsappNumber: string
  n8nWebhook: string
  language: string
  currency: string
  save: string
  saved: string
}

export default function SettingsClient({
  initialSettings,
  userId,
  t
}: {
  initialSettings: Settings | null
  userId: string
  t: T
}) {
  const [form, setForm] = useState<Settings>({
    app_name: initialSettings?.app_name ?? 'CV Master CRM',
    whatsapp_number: initialSettings?.whatsapp_number ?? '',
    n8n_webhook_url: initialSettings?.n8n_webhook_url ?? '',
    locale: initialSettings?.locale ?? 'ar',
    currency: initialSettings?.currency ?? 'SAR'
  })
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('settings').upsert({
      ...form,
      user_id: userId,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' })

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fields = [
    { key: 'app_name', label: t.appName, type: 'text' },
    { key: 'whatsapp_number', label: t.whatsappNumber, type: 'tel' },
    { key: 'n8n_webhook_url', label: t.n8nWebhook, type: 'url' }
  ]

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">{t.title}</h1>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 space-y-4">
        {fields.map(({ key, label, type }) => (
          <div key={key}>
            <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
            <input
              type={type}
              value={form[key as keyof Settings] as string ?? ''}
              onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        ))}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.language}</label>
          <select
            value={form.locale}
            onChange={e => setForm(f => ({ ...f, locale: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">{t.currency}</label>
          <select
            value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="SAR">ريال سعودي (SAR)</option>
            <option value="EGP">جنيه مصري (EGP)</option>
            <option value="USD">دولار أمريكي (USD)</option>
          </select>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saved ? `✓ ${t.saved}` : saving ? '...' : t.save}
        </button>
      </div>
    </div>
  )
}
