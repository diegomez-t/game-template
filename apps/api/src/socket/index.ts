import { Server as SocketServer } from "socket.io"
import type { Server } from "node:http"
import { ENV } from "../env.js"
import { RoomManager } from "./RoomManager.js"
import { registerConnectionHandlers } from "./handlers/connection.js"
import { registerRoomHandlers } from "./handlers/room.js"
import { registerGameHandlers } from "./handlers/game.js"
import { registerChatHandlers } from "./handlers/chat.js"
import type { ClientToServerEvents, ServerToClientEvents } from "@template/core"

export type GameSocket = SocketServer<ClientToServerEvents, ServerToClientEvents>

let io: GameSocket | null = null

export function getIO(): GameSocket {
  if (!io) {
    throw new Error("Socket.IO not initialized")
  }
  return io
}

export async function initializeSocketServer(httpServer: Server): Promise<void> {
  io = new SocketServer<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: ENV.CORS_ORIGIN,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  // Initialiser le RoomManager
  RoomManager.getInstance()

  // Gestion des connexions
  io.on("connection", (socket) => {
    console.log(`Socket connecté: ${socket.id}`)

    // Enregistrer les handlers
    registerConnectionHandlers(socket)
    registerRoomHandlers(socket)
    registerGameHandlers(socket)
    registerChatHandlers(socket)
  })

  console.log("Socket.IO server initialized")
}

