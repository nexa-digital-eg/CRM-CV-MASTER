export const N8N_AUTOMATION_USER_ID = '00000000-0000-0000-0000-000000000001'

export function formatCurrency(amount: number, currency = 'SAR') {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(amount)
}

export function formatDate(date: string, locale = 'ar') {
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-SA' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

export const statusColors: Record<string, string> = {
  lead: 'bg-yellow-100 text-yellow-800',
  prospect: 'bg-blue-100 text-blue-800',
  client: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  new: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  proposal: 'bg-purple-100 text-purple-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
  todo: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
  high: 'bg-red-100 text-red-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-gray-100 text-gray-600',
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700'
}

export const darkStatusColors: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-300 border border-blue-500/25',
  contacted: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/25',
  service_identified: 'bg-violet-500/15 text-violet-300 border border-violet-500/25',
  price_sent: 'bg-purple-500/15 text-purple-300 border border-purple-500/25',
  waiting_response: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  waiting_payment: 'bg-orange-500/15 text-orange-300 border border-orange-500/25',
  proof_sent: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25',
  payment_confirmed: 'bg-teal-500/15 text-teal-300 border border-teal-500/25',
  in_progress: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25',
  delivered: 'bg-green-500/15 text-green-300 border border-green-500/25',
  not_completed: 'bg-red-500/15 text-red-300 border border-red-500/25',
  follow_up_later: 'bg-slate-500/15 text-slate-300 border border-slate-500/25',
  pending: 'bg-amber-500/15 text-amber-300 border border-amber-500/25',
  review: 'bg-purple-500/15 text-purple-300 border border-purple-500/25',
  completed: 'bg-green-500/15 text-green-300 border border-green-500/25',
  cancelled: 'bg-red-500/15 text-red-300 border border-red-500/25',
  refunded: 'bg-slate-500/15 text-slate-300 border border-slate-500/25',
  proof_submitted: 'bg-yellow-500/15 text-yellow-300 border border-yellow-500/25',
  confirmed: 'bg-green-500/15 text-green-300 border border-green-500/25',
  rejected: 'bg-red-500/15 text-red-300 border border-red-500/25',
}

export const sourceColors: Record<string, string> = {
  whatsapp: 'bg-green-500/15 text-green-400',
  messenger: 'bg-blue-500/15 text-blue-400',
  facebook_ad: 'bg-blue-600/15 text-blue-400',
  instagram: 'bg-pink-500/15 text-pink-400',
  instagram_ad: 'bg-purple-500/15 text-purple-400',
  website: 'bg-slate-500/15 text-slate-400',
  referral: 'bg-amber-500/15 text-amber-400',
  other: 'bg-gray-500/15 text-gray-400',
}
