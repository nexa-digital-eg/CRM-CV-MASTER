'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navItems = [
  { key: 'dashboard', href: '', icon: '⊞' },
  { key: 'contacts', href: '/contacts', icon: '👥' },
  { key: 'deals', href: '/deals', icon: '💼' },
  { key: 'tasks', href: '/tasks', icon: '✓' },
  { key: 'invoices', href: '/invoices', icon: '🧾' },
  { key: 'whatsapp', href: '/whatsapp', icon: '💬' },
  { key: 'settings', href: '/settings', icon: '⚙' }
]

export default function Sidebar() {
  const t = useTranslations('nav')
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push(`/${locale}/login`)
  }

  return (
    <aside className="w-60 min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <h1 className="text-lg font-bold text-white">CV Master CRM</h1>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ key, href, icon }) => {
          const fullHref = `/${locale}${href}`
          const isActive = href === ''
            ? pathname === `/${locale}` || pathname === `/${locale}/`
            : pathname.startsWith(fullHref)

          return (
            <Link
              key={key}
              href={fullHref}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">{icon}</span>
              {t(key as 'dashboard' | 'contacts' | 'deals' | 'tasks' | 'invoices' | 'whatsapp' | 'settings')}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 pb-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <span className="text-base">↩</span>
          {t('logout')}
        </button>
      </div>
    </aside>
  )
}
