'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

type Message = {
  id: string; phone: string; body: string; direction: string
  is_ai: boolean | null; created_at: string; contact_id: string | null
  contacts: { name: string; ai_enabled: boolean | null } | { name: string; ai_enabled: boolean | null }[] | null
}

type T = {
  title: string; selectContact: string; aiMessage: string
  inbound: string; outbound: string; noConversations: string
}

function getContactInfo(contacts: Message['contacts']): { name: string; ai_enabled: boolean } {
  if (!contacts) return { name: '', ai_enabled: true }
  const c = Array.isArray(contacts) ? contacts[0] : contacts
  if (!c) return { name: '', ai_enabled: true }
  return { name: c.name, ai_enabled: c.ai_enabled !== false }
}

export default function WhatsappClient({ messages, t }: { messages: Message[]; t: T }) {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [aiStates, setAiStates] = useState<Record<string, boolean>>({})
  const [togglingAi, setTogglingAi] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const conversations = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; ai_enabled: boolean; lastMsg: Message; unread: number }>()
    for (const msg of messages) {
      const info = getContactInfo(msg.contacts)
      const existing = map.get(msg.phone)
      const isNewer = !existing || new Date(msg.created_at) > new Date(existing.lastMsg.created_at)
      map.set(msg.phone, {
        phone: msg.phone,
        name: info.name || msg.phone,
        ai_enabled: info.ai_enabled,
        lastMsg: isNewer ? msg : existing!.lastMsg,
        unread: (existing?.unread ?? 0) + (msg.direction === 'inbound' ? 1 : 0)
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

  const toggleAI = async () => {
    if (!selectedConv?.lastMsg.contact_id || !selectedPhone) return
    setTogglingAi(selectedPhone)
    const newVal = !aiEnabled
    const supabase = createClient()
    await supabase.from('contacts').update({ ai_enabled: newVal }).eq('id', selectedConv.lastMsg.contact_id)
    setAiStates(s => ({ ...s, [selectedPhone]: newVal }))
    setTogglingAi(null)
  }

  if (!conversations.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 page-enter">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mb-4 opacity-30">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <p className="font-medium">{t.noConversations}</p>
        <p className="text-sm mt-1">رسائل الواتساب من n8n ستظهر هنا</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Contact list */}
      <div className="w-80 border-e border-slate-100 bg-white flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-800">{t.title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{conversations.length} محادثة</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv.phone}
              onClick={() => setSelectedPhone(conv.phone)}
              className={`w-full text-start px-5 py-4 border-b border-slate-50 transition-all ${
                selectedPhone === conv.phone
                  ? 'bg-indigo-50 border-s-2 border-s-indigo-500'
                  : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                  conv.ai_enabled ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}>
                  {(conv.name || conv.phone).charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-800 truncate">{conv.name || conv.phone}</p>
                    <p className="text-xs text-slate-400 shrink-0">
                      {new Date(conv.lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-500 truncate flex-1">{conv.lastMsg.body}</p>
                    {!conv.ai_enabled && (
                      <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">AI off</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {!selectedPhone ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 mb-4 opacity-20">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-sm font-medium">{t.selectContact}</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="bg-white px-6 py-4 border-b border-slate-100 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                  aiEnabled ? 'bg-gradient-to-br from-indigo-400 to-purple-500' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}>
                  {(selectedConv?.name || selectedPhone).charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{selectedConv?.name || selectedPhone}</p>
                  <p className="text-xs text-slate-500 font-mono">{selectedPhone}</p>
                </div>
              </div>

              {/* AI Toggle */}
              <div className="flex items-center gap-3">
                <div className="text-end">
                  <p className="text-xs font-semibold text-slate-700">AI Agent</p>
                  <p className={`text-xs ${aiEnabled ? 'text-green-600' : 'text-slate-400'}`}>
                    {aiEnabled ? '● شغّال' : '○ متوقف'}
                  </p>
                </div>
                <button
                  onClick={toggleAI}
                  disabled={togglingAi === selectedPhone}
                  className={`relative inline-flex h-7 w-13 items-center rounded-full toggle-track transition-colors disabled:opacity-60 shadow-inner ${aiEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  style={{ width: '52px' }}
                >
                  <span className={`toggle-thumb inline-block h-5 w-5 rounded-full bg-white shadow-md ${aiEnabled ? 'translate-x-7' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {currentMessages.map((msg, i) => {
                const isOut = msg.direction === 'outbound'
                return (
                  <div key={msg.id} className={`flex ${isOut ? 'justify-end' : 'justify-start'} ${isOut ? 'bubble-in' : 'bubble-out'}`}
                    style={{ animationDelay: `${i * 20}ms` }}>
                    <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-3 shadow-sm ${
                      isOut
                        ? 'text-white rounded-br-sm'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-sm'
                    }`}
                    style={isOut ? { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' } : {}}>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <p className={`text-xs ${isOut ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {msg.is_ai && (
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            isOut ? 'bg-indigo-500/50 text-indigo-100' : 'bg-purple-100 text-purple-700'
                          }`}>AI</span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
