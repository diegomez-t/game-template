"use client"

import { useState } from "react"
import Link from "next/link"

export default function Home() {
  const [playerName, setPlayerName] = useState("")
  const [roomCode, setRoomCode] = useState("")

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        {/* Logo / Titre */}
        <div className="text-center">
          <h1 className="text-5xl font-bold text-white mb-2">🎮 Game Template</h1>
          <p className="text-gray-400">Créez votre propre jeu multijoueur</p>
        </div>

        {/* Formulaire */}
        <div className="card space-y-6">
          {/* Nom du joueur */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Votre pseudo
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Entrez votre pseudo"
              className="input"
              maxLength={20}
            />
          </div>

          {/* Actions */}
          <div className="space-y-4">
            {/* Créer une partie */}
            <Link
              href={`/room/create?name=${encodeURIComponent(playerName)}`}
              className={`btn-primary w-full block text-center ${
                !playerName.trim() ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              🎲 Créer une partie
            </Link>

            {/* Séparateur */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-game-card text-gray-400">ou</span>
              </div>
            </div>

            {/* Rejoindre une partie */}
            <div className="flex gap-2">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Code de partie"
                className="input flex-1"
                maxLength={6}
              />
              <Link
                href={`/room/${roomCode}?name=${encodeURIComponent(playerName)}`}
                className={`btn-secondary ${
                  !playerName.trim() || roomCode.length !== 6
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                Rejoindre
              </Link>
            </div>
          </div>
        </div>

        {/* Parties publiques */}
        <div className="text-center">
          <Link href="/rooms" className="text-primary-400 hover:text-primary-300 text-sm">
            Voir les parties publiques →
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-500 text-xs">
          Template basé sur l'architecture de Skymo
        </p>
      </div>
    </main>
  )
}

