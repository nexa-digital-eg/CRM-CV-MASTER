'use client'

import { useState, useMemo } from 'react'

type Message = {
  id: string
  phone: string
  body: string
  direction: string
  is_ai: boolean | null
  created_at: string
  contact_id: string | null
  contacts: { name: string } | { name: string }[] | null
}

type T = {
  title: string
  selectContact: string
  aiMessage: string
  inbound: string
  outbound: string
  noConversations: string
}

export default function WhatsappClient({ messages, t }: { messages: Message[]; t: T }) {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)

  const conversations = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; lastMsg: Message }>()
    for (const msg of messages) {
      const existing = map.get(msg.phone)
      if (!existing || new Date(msg.created_at) > new Date(existing.lastMsg.created_at)) {
        map.set(msg.phone, {
          phone: msg.phone,
          name: (msg.contacts ? (Array.isArray(msg.contacts) ? msg.contacts[0]?.name : msg.contacts.name) : null) ?? msg.phone,
          lastMsg: msg
        })
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastMsg.created_at).getTime() - new Date(a.lastMsg.created_at).getTime()
    )
  }, [messages])

  const currentMessages = useMemo(() =>
    messages.filter(m => m.phone === selectedPhone),
    [messages, selectedPhone]
  )

  if (!conversations.length) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 p-8">
        {t.noConversations}
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Contact list */}
      <div className="w-72 border-e border-slate-100 bg-white overflow-y-auto">
        <div className="p-4 border-b border-slate-100">
          <h1 className="text-base font-bold text-slate-800">{t.title}</h1>
        </div>
        {conversations.map(conv => (
          <button
            key={conv.phone}
            onClick={() => setSelectedPhone(conv.phone)}
            className={`w-full text-start px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
              selectedPhone === conv.phone ? 'bg-indigo-50 border-s-2 border-s-indigo-500' : ''
            }`}
          >
            <p className="text-sm font-semibold text-slate-800 truncate">{conv.name}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{conv.lastMsg.body}</p>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 flex flex-col bg-slate-50">
        {!selectedPhone ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            {t.selectContact}
          </div>
        ) : (
          <>
            <div className="bg-white px-4 py-3 border-b border-slate-100 shadow-sm">
              <p className="font-semibold text-slate-800">
                {conversations.find(c => c.phone === selectedPhone)?.name ?? selectedPhone}
              </p>
              <p className="text-xs text-slate-500 font-mono">{selectedPhone}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {currentMessages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 ${
                    msg.direction === 'outbound'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-sm'
                  }`}>
                    <p className="text-sm leading-relaxed">{msg.body}</p>
                    <div className="flex items-center gap-1.5 mt-1">
                      <p className={`text-xs ${msg.direction === 'outbound' ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {msg.is_ai && (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          msg.direction === 'outbound' ? 'bg-indigo-500 text-indigo-100' : 'bg-purple-100 text-purple-700'
                        }`}>AI</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
