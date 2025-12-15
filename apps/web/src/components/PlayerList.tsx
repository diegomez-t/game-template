"use client"

import { useGameStore } from "@/store/gameStore"

export function PlayerList() {
  const { players, player } = useGameStore()

  return (
    <div className="card">
      <h2 className="text-xl font-bold mb-4">
        Joueurs ({players.length})
      </h2>

      <div className="space-y-2">
        {players.map((p) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-3 rounded-lg ${
              p.id === player?.id
                ? "bg-primary-900/50 border border-primary-500"
                : "bg-gray-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xl">
                {p.avatar || "👤"}
              </div>

              {/* Nom */}
              <div>
                <div className="font-medium flex items-center gap-2">
                  {p.name}
                  {p.isHost && (
                    <span className="text-xs bg-yellow-500 text-black px-2 py-0.5 rounded">
                      Hôte
                    </span>
                  )}
                  {p.id === player?.id && (
                    <span className="text-xs text-gray-400">(vous)</span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  Score: {p.score}
                </div>
              </div>
            </div>

            {/* Statut */}
            <div className="flex items-center gap-2">
              {p.isReady ? (
                <span className="text-green-400 text-sm">✓ Prêt</span>
              ) : (
                <span className="text-gray-500 text-sm">En attente</span>
              )}

              {/* Indicateur de connexion */}
              <div
                className={`w-3 h-3 rounded-full ${
                  p.connectionStatus === "connected"
                    ? "bg-green-500"
                    : "bg-red-500"
                }`}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

