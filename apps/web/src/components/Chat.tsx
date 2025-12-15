"use client"

import { useState, useRef, useEffect } from "react"
import { useGameStore } from "@/store/gameStore"
import { useGameActions } from "@/hooks/useSocket"

export function Chat() {
  const { messages } = useGameStore()
  const { sendMessage } = useGameActions()
  const [input, setInput] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    sendMessage(input.trim())
    setInput("")
  }

  return (
    <div className="card flex flex-col h-80">
      <h2 className="text-lg font-bold mb-3">Chat</h2>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center">
            Pas encore de messages
          </p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`text-sm ${
                msg.isSystem ? "text-yellow-400 italic" : ""
              }`}
            >
              {!msg.isSystem && (
                <span className="font-medium text-primary-400">
                  {msg.playerName}:{" "}
                </span>
              )}
              <span className={msg.isSystem ? "" : "text-gray-300"}>
                {msg.message}
              </span>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Écrire un message..."
          className="input flex-1 py-2 text-sm"
          maxLength={500}
        />
        <button type="submit" className="btn-primary py-2 px-4 text-sm">
          Envoyer
        </button>
      </form>
    </div>
  )
}

