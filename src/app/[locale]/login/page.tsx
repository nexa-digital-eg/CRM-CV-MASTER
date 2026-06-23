'use client'

import { useState } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const t = useTranslations('auth')
  const locale = useLocale()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(t('loginError'))
      setLoading(false)
    } else {
      router.push(`/${locale}`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)' }}>
      {/* Background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle,#6366f1,transparent)' }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle,#8b5cf6,transparent)' }} />
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm mx-4 modal-content">
        {/* Glass card */}
        <div className="rounded-3xl shadow-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.12)' }}>

          {/* Top gradient bar */}
          <div className="h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)' }} />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg"
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
                <svg viewBox="0 0 24 24" fill="white" className="w-8 h-8">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white">CV Master CRM</h1>
              <p className="text-indigo-300 text-sm mt-1">{t('login')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('email')}</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="name@example.com"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('password')}</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all pe-11"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <button type="button" onClick={() => setShowPass(p => !p)}
                    className="absolute inset-y-0 end-3 flex items-center text-slate-400 hover:text-slate-200 transition-colors">
                    {showPass
                      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                      : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    }
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-red-300"
                  style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 shrink-0">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-60 shadow-lg"
                style={{ background: loading ? '#4338ca' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 8px 20px rgba(99,102,241,0.4)' }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="spin-slow w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    جارٍ الدخول...
                  </span>
                ) : t('loginButton')}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
