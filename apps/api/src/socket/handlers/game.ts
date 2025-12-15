import type { Socket } from "socket.io"
import { gameActionSchema, validate } from "@template/shared"
import { RoomManager } from "../RoomManager.js"
import { getIO } from "../index.js"

/**
 * Handlers pour le jeu
 */
export function registerGameHandlers(socket: Socket): void {
  const roomManager = RoomManager.getInstance()
  const io = getIO()

  /**
   * Démarrer la partie (hôte uniquement)
   */
  socket.on("game:start", async () => {
    const room = roomManager.getPlayerRoom(socket.id)
    if (!room) {
      socket.emit("error", { code: "NOT_IN_ROOM", message: "Not in a room" })
      return
    }

    const player = room.getPlayerBySocketId(socket.id)
    if (!player || !player.isHost) {
      socket.emit("error", { code: "NOT_HOST", message: "Only host can start" })
      return
    }

    // Vérifier que tous sont prêts
    if (!room.allPlayersReady()) {
      socket.emit("error", { code: "NOT_READY", message: "Not all players ready" })
      return
    }

    // Vérifier le nombre de joueurs
    if (room.playerCount < room.settings.minPlayers) {
      socket.emit("error", { code: "NOT_ENOUGH_PLAYERS", message: "Not enough players" })
      return
    }

    try {
      // TODO: Créer une instance du jeu spécifique
      // const game = new YourGameClass({ hostId: player.id })
      // await game.start()
      // room.setGame(game)

      console.log(`Partie démarrée dans ${room.code}`)

      // Notifier tous les joueurs
      io.to(room.code).emit("game:started", room.getState() as any)

      // TODO: Démarrer le premier tour
      // io.to(room.code).emit("turn:start", { ... })
    } catch (error) {
      console.error("Error starting game:", error)
      socket.emit("error", { code: "START_ERROR", message: "Could not start game" })
    }
  })

  /**
   * Action de jeu
   */
  socket.on("game:action", async (data, callback) => {
    const room = roomManager.getPlayerRoom(socket.id)
    if (!room) {
      return callback({ success: false, error: "Not in a room" })
    }

    const game = room.game
    if (!game) {
      return callback({ success: false, error: "Game not started" })
    }

    const player = room.getPlayerBySocketId(socket.id)
    if (!player) {
      return callback({ success: false, error: "Player not found" })
    }

    // Valider l'action
    const validation = validate(gameActionSchema, data)
    if (!validation.success) {
      return callback({ success: false, error: "Invalid action data" })
    }

    const { type, data: actionData } = validation.data

    // Vérifier que c'est le tour du joueur
    if (game.currentPlayerId !== player.id) {
      return callback({ success: false, error: "Not your turn" })
    }

    // Vérifier que l'action est valide
    const validActions = game.getValidActions(player.id)
    if (!validActions.includes(type)) {
      return callback({ success: false, error: "Invalid action" })
    }

    try {
      // Exécuter l'action
      const success = await game.handleAction(player.id, type, actionData)

      if (!success) {
        return callback({ success: false, error: "Action failed" })
      }

      callback({ success: true })

      // Notifier tous les joueurs
      io.to(room.code).emit("game:action", {
        playerId: player.id,
        type,
        data: actionData,
        timestamp: Date.now(),
      })

      // Mettre à jour l'état
      io.to(room.code).emit("game:state", game.getState())

      // Vérifier si la partie est terminée
      if (game.status === "finished") {
        // TODO: Calculer les scores et envoyer le résultat
        io.to(room.code).emit("game:ended", {
          winnerId: null, // TODO
          rankings: [],
          stats: {},
        })
      }
    } catch (error) {
      console.error("Error handling action:", error)
      callback({ success: false, error: "Action error" })
    }
  })

  /**
   * Transférer l'hôte
   */
  socket.on("player:transfer-host", (targetPlayerId) => {
    const room = roomManager.getPlayerRoom(socket.id)
    if (!room) return

    const player = room.getPlayerBySocketId(socket.id)
    if (!player || !player.isHost) return

    const targetPlayer = room.getPlayer(targetPlayerId)
    if (!targetPlayer) return

    player.isHost = false
    targetPlayer.isHost = true

    io.to(room.code).emit("room:updated", room.getState())
    io.to(room.code).emit("chat:system", `${targetPlayer.name} est maintenant l'hôte`)
  })

  /**
   * Expulser un joueur (hôte uniquement)
   */
  socket.on("player:kick", (targetPlayerId) => {
    const room = roomManager.getPlayerRoom(socket.id)
    if (!room) return

    const player = room.getPlayerBySocketId(socket.id)
    if (!player || !player.isHost) return

    const targetPlayer = room.getPlayer(targetPlayerId)
    if (!targetPlayer || targetPlayer.isHost) return

    // Retirer le joueur
    room.removePlayer(targetPlayerId)
    roomManager.removePlayerFromRoom(targetPlayer.socketId)

    // Notifier
    io.to(room.code).emit("room:player-left", targetPlayerId)
    io.to(room.code).emit("room:updated", room.getState())
    io.to(targetPlayer.socketId).emit("room:closed", "You were kicked")
  })
}

