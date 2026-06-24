'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string; phone: string; body: string; direction: string
  is_ai: boolean | null; created_at: string; contact_id: string | null
  contacts: { name: string; ai_enabled: boolean | null } | { name: string; ai_enabled: boolean | null }[] | null
}

function getContactInfo(contacts: Message['contacts']): { name: string; ai_enabled: boolean } {
  if (!contacts) return { name: '', ai_enabled: true }
  const c = Array.isArray(contacts) ? contacts[0] : contacts
  if (!c) return { name: '', ai_enabled: true }
  return { name: c.name, ai_enabled: c.ai_enabled !== false }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date(); today.setHours(0,0,0,0)
  const msgDay = new Date(d); msgDay.setHours(0,0,0,0)
  const diff = today.getTime() - msgDay.getTime()
  if (diff === 0) return 'اليوم'
  if (diff === 86400000) return 'أمس'
  return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
}

const BG = 'linear-gradient(160deg,#0b0f18 0%,#0d1220 60%,#0b0f18 100%)'
const SIDEBAR_BG = 'rgba(255,255,255,0.02)'
const CARD_BORDER = 'rgba(255,255,255,0.07)'

export default function WhatsappClient({
  messages: init, userId, locale
}: {
  messages: Message[]; userId: string; locale: string
}) {
  const [messages, setMessages] = useState(init)
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [aiStates, setAiStates] = useState<Record<string, boolean>>({})
  const [togglingAi, setTogglingAi] = useState<string | null>(null)
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Realtime subscription for new messages
  useEffect(() => {
    const channel = supabase
      .channel('whatsapp-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          const newMsg = payload.new as Message
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const conversations = useMemo(() => {
    const map = new Map<string, {
      phone: string; name: string; ai_enabled: boolean
      lastMsg: Message; unreadCount: number
    }>()
    for (const msg of messages) {
      const info = getContactInfo(msg.contacts)
      const existing = map.get(msg.phone)
      const isNewer = !existing || new Date(msg.created_at) > new Date(existing.lastMsg.created_at)
      map.set(msg.phone, {
        phone: msg.phone,
        name: info.name || msg.phone,
        ai_enabled: info.ai_enabled,
        lastMsg: isNewer ? msg : existing!.lastMsg,
        unreadCount: (existing?.unreadCount ?? 0) + (msg.direction === 'inbound' ? 1 : 0)
      })
    }
    return Array.from(map.values()).sort((a, b) =>
      new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()
    )
  }, [messages])

  const currentMessages = useMemo(() =>
    messages.filter(m => m.phone === selectedPhone),
    [messages, selectedPhone]
  )

  const selectedConv = conversations.find(c => c.phone === selectedPhone)
  const aiEnabled = selectedPhone
    ? (aiStates[selectedPhone] ?? selectedConv?.ai_enabled ?? true)
    : true

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentMessages])

  useEffect(() => {
    if (selectedPhone) inputRef.current?.focus()
  }, [selectedPhone])

  const toggleAI = async () => {
    if (!selectedConv?.lastMsg.contact_id || !selectedPhone) return
    setTogglingAi(selectedPhone)
    const newVal = !aiEnabled
    await supabase.from('contacts').update({ ai_enabled: newVal }).eq('id', selectedConv.lastMsg.contact_id)
    setAiStates(s => ({ ...s, [selectedPhone]: newVal }))
    setTogglingAi(null)
  }

  const handleSend = async () => {
    if (!inputText.trim() || !selectedPhone || sending) return
    const text = inputText.trim()
    setInputText('')
    setSending(true)

    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      phone: selectedPhone,
      body: text,
      direction: 'outbound',
      is_ai: false,
      created_at: new Date().toISOString(),
      contact_id: selectedConv?.lastMsg.contact_id ?? null,
      contacts: selectedConv ? { name: selectedConv.name, ai_enabled: aiEnabled } : null
    }
    setMessages(prev => [...prev, optimistic])

    const { data } = await supabase.from('whatsapp_messages').insert({
      phone: selectedPhone,
      body: text,
      direction: 'outbound',
      is_ai: false,
      user_id: userId,
      contact_id: selectedConv?.lastMsg.contact_id ?? null
    }).select('id').single()

    if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? { ...m, id: data.id } : m))
    }
    setSending(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Group messages by date
  const groupedMessages = useMemo(() => {
    const groups: { date: string; messages: Message[] }[] = []
    for (const msg of currentMessages) {
      const dateLabel = formatDate(msg.created_at)
      const last = groups[groups.length - 1]
      if (!last || last.date !== dateLabel) {
        groups.push({ date: dateLabel, messages: [msg] })
      } else {
        last.messages.push(msg)
      }
    }
    return groups
  }, [currentMessages])

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full" style={{ background: BG }}>
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-green-400">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <p className="text-slate-300 font-semibold text-lg">لا توجد محادثات</p>
        <p className="text-slate-600 text-sm mt-2">رسائل الواتساب من n8n ستظهر هنا تلقائيًا</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: BG }}>

      {/* ─── Conversations Sidebar ─── */}
      <div className="w-80 flex flex-col border-e" style={{ background: SIDEBAR_BG, borderColor: CARD_BORDER }}>

        {/* Header */}
        <div className="px-5 py-4 border-b" style={{ borderColor: CARD_BORDER }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.12)' }}>
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-400">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-sm">المحادثات</p>
              <p className="text-slate-500 text-xs">{conversations.length} محادثة</p>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => {
            const isSelected = selectedPhone === conv.phone
            return (
              <button
                key={conv.phone}
                onClick={() => setSelectedPhone(conv.phone)}
                className="w-full text-start px-4 py-3.5 border-b transition-all"
                style={{
                  borderColor: CARD_BORDER,
                  background: isSelected
                    ? 'rgba(34,197,94,0.08)'
                    : 'transparent',
                  borderInlineStart: isSelected ? '3px solid #22c55e' : '3px solid transparent'
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{
                        background: conv.ai_enabled
                          ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                          : 'linear-gradient(135deg,#475569,#334155)'
                      }}>
                      {(conv.name || conv.phone).charAt(0).toUpperCase()}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">
                        {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p className="text-sm font-semibold text-slate-200 truncate">{conv.name || conv.phone}</p>
                      <p className="text-xs text-slate-600 shrink-0">{formatTime(conv.lastMsg.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {conv.lastMsg.direction === 'outbound' && (
                        <svg viewBox="0 0 16 11" fill="none" className="w-3.5 h-3 shrink-0" style={{ color: '#22c55e' }}>
                          <path d="M11.071.653L5.5 6.224 2.929 3.653 1.5 5.082 5.5 9.082l6.571-6.571L11.071.653z" fill="currentColor"/>
                          <path d="M14.071.653L8.5 6.224 7.929 5.653l-1.5 1.5.071.071L11.5 9.082l6.571-6.571L16.571.653l-2.5 2.5z" fill="currentColor" opacity=".5"/>
                        </svg>
                      )}
                      <p className="text-xs text-slate-500 truncate flex-1">{conv.lastMsg.body}</p>
                      {!conv.ai_enabled && (
                        <span className="shrink-0 text-xs px-1.5 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.12)', color: '#fbbf24' }}>
                          AI off
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Chat Area ─── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedPhone ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10 text-slate-700">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-slate-400 font-medium">اختر محادثة للبدء</p>
            <p className="text-slate-700 text-sm mt-1">اضغط على أي محادثة من القائمة</p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b"
              style={{ background: SIDEBAR_BG, borderColor: CARD_BORDER }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: aiEnabled ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'linear-gradient(135deg,#475569,#334155)' }}>
                  {(selectedConv?.name || selectedPhone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-white text-sm">{selectedConv?.name || selectedPhone}</p>
                  <p className="text-xs font-mono" style={{ color: '#64748b' }}>{selectedPhone}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* WhatsApp link */}
                <a
                  href={`https://wa.me/${selectedPhone.replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="p-2 rounded-xl transition-all hover:bg-white/5"
                  title="فتح في واتساب"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-green-400">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                  </svg>
                </a>

                {/* AI Toggle */}
                <div className="flex items-center gap-2.5">
                  <div className="text-end">
                    <p className="text-xs font-semibold text-slate-400">AI Agent</p>
                    <p className={`text-xs font-medium ${aiEnabled ? 'text-green-400' : 'text-slate-600'}`}>
                      {aiEnabled ? '● شغّال' : '○ متوقف'}
                    </p>
                  </div>
                  <button
                    onClick={toggleAI}
                    disabled={togglingAi === selectedPhone}
                    className="relative inline-flex h-6 items-center rounded-full transition-colors disabled:opacity-60"
                    style={{
                      width: '44px',
                      background: aiEnabled ? '#22c55e' : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-md transition-transform ${aiEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-1"
              style={{ background: 'rgba(0,0,0,0.2)' }}>
              {groupedMessages.map(({ date, messages: dayMsgs }) => (
                <div key={date}>
                  {/* Date divider */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                    <span className="text-xs px-3 py-1 rounded-full text-slate-500"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {date}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.05)' }} />
                  </div>

                  {dayMsgs.map((msg) => {
                    const isOut = msg.direction === 'outbound'
                    const isOptimistic = msg.id.startsWith('opt-')
                    return (
                      <div key={msg.id} className={`flex mb-2 ${isOut ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className="max-w-xs lg:max-w-md xl:max-w-lg rounded-2xl px-4 py-2.5"
                          style={isOut
                            ? {
                                background: msg.is_ai
                                  ? 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(139,92,246,0.25))'
                                  : 'linear-gradient(135deg,#166534,#15803d)',
                                border: msg.is_ai ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(34,197,94,0.2)',
                                borderEndEndRadius: '4px',
                                opacity: isOptimistic ? 0.7 : 1
                              }
                            : {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                borderEndStartRadius: '4px'
                              }
                          }
                        >
                          <p className="text-sm leading-relaxed text-slate-100">{msg.body}</p>
                          <div className={`flex items-center gap-1.5 mt-1 ${isOut ? 'justify-end' : 'justify-start'}`}>
                            <span className="text-xs text-slate-500">{formatTime(msg.created_at)}</span>
                            {msg.is_ai && (
                              <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                                style={{ background: 'rgba(168,85,247,0.2)', color: '#c084fc' }}>
                                AI
                              </span>
                            )}
                            {isOut && !isOptimistic && (
                              <svg viewBox="0 0 16 11" fill="none" className="w-3.5 h-2.5" style={{ color: '#22c55e' }}>
                                <path d="M11.071.653L5.5 6.224 2.929 3.653 1.5 5.082 5.5 9.082l6.571-6.571L11.071.653z" fill="currentColor"/>
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 py-3 border-t" style={{ borderColor: CARD_BORDER, background: SIDEBAR_BG }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center rounded-2xl px-4 gap-3"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="اكتب رسالة..."
                    dir="rtl"
                    className="flex-1 bg-transparent py-3 text-sm text-slate-200 placeholder-slate-600 outline-none"
                  />
                  {/* Emoji placeholder */}
                  <button className="text-slate-600 hover:text-slate-400 transition-colors shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                      <circle cx="12" cy="12" r="10"/>
                      <path d="M8 13s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>
                    </svg>
                  </button>
                </div>

                <button
                  onClick={handleSend}
                  disabled={!inputText.trim() || sending}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all disabled:opacity-40"
                  style={{
                    background: inputText.trim() ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {sending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
                      <line x1="22" y1="2" x2="11" y2="13"/>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
