"use client"

import { useEffect, useCallback } from "react"
import { getSocket, connectSocket, disconnectSocket, type GameSocket } from "@/lib/socket"
import { useGameStore } from "@/store/gameStore"

export function useSocket() {
  const {
    setConnected,
    setPlayers,
    setSettings,
    setIsHost,
    addMessage,
    reset,
  } = useGameStore()

  useEffect(() => {
    const socket = getSocket()

    // Connexion
    socket.on("connect", () => {
      console.log("Socket connected")
      setConnected(true)
    })

    socket.on("disconnect", () => {
      console.log("Socket disconnected")
      setConnected(false)
    })

    // Room events
    socket.on("room:updated", (state) => {
      setPlayers(state.players)
      setSettings(state.settings)
      const player = useGameStore.getState().player
      if (player) {
        const currentPlayer = state.players.find((p) => p.id === player.id)
        setIsHost(currentPlayer?.isHost ?? false)
      }
    })

    socket.on("room:closed", (reason) => {
      console.log("Room closed:", reason)
      reset()
    })

    // Chat
    socket.on("chat:message", (data) => {
      addMessage({
        id: crypto.randomUUID(),
        ...data,
      })
    })

    socket.on("chat:system", (message) => {
      addMessage({
        id: crypto.randomUUID(),
        playerId: "system",
        playerName: "Système",
        message,
        timestamp: Date.now(),
        isSystem: true,
      })
    })

    // Errors
    socket.on("error", (error) => {
      console.error("Socket error:", error)
    })

    // Connect
    connectSocket()

    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("room:updated")
      socket.off("room:closed")
      socket.off("chat:message")
      socket.off("chat:system")
      socket.off("error")
    }
  }, [setConnected, setPlayers, setSettings, setIsHost, addMessage, reset])

  return getSocket()
}

export function useCreateRoom() {
  const { setRoomCode, setPlayer } = useGameStore()

  return useCallback(
    async (playerName: string, settings?: Record<string, unknown>) => {
      const socket = getSocket()

      return new Promise<string>((resolve, reject) => {
        socket.emit(
          "room:create",
          { playerName, settings },
          (response) => {
            if (response.success && response.roomCode) {
              setRoomCode(response.roomCode)
              resolve(response.roomCode)
            } else {
              reject(new Error(response.error || "Failed to create room"))
            }
          }
        )
      })
    },
    [setRoomCode, setPlayer]
  )
}

export function useJoinRoom() {
  const { setRoomCode, setPlayer } = useGameStore()

  return useCallback(
    async (roomCode: string, playerName: string) => {
      const socket = getSocket()

      return new Promise<void>((resolve, reject) => {
        socket.emit(
          "room:join",
          { roomCode, playerName },
          (response) => {
            if (response.success) {
              setRoomCode(roomCode)
              resolve()
            } else {
              reject(new Error(response.error || "Failed to join room"))
            }
          }
        )
      })
    },
    [setRoomCode, setPlayer]
  )
}

export function useLeaveRoom() {
  const { reset } = useGameStore()

  return useCallback(() => {
    const socket = getSocket()
    socket.emit("room:leave")
    reset()
  }, [reset])
}

export function useGameActions() {
  const socket = getSocket()

  const setReady = useCallback((isReady: boolean) => {
    socket.emit("game:ready", isReady)
  }, [socket])

  const startGame = useCallback(() => {
    socket.emit("game:start")
  }, [socket])

  const sendAction = useCallback(
    async (type: string, data: Record<string, unknown> = {}) => {
      return new Promise<void>((resolve, reject) => {
        socket.emit("game:action", { type, data }, (response) => {
          if (response.success) {
            resolve()
          } else {
            reject(new Error(response.error || "Action failed"))
          }
        })
      })
    },
    [socket]
  )

  const sendMessage = useCallback((message: string) => {
    socket.emit("chat:message", message)
  }, [socket])

  return { setReady, startGame, sendAction, sendMessage }
}

