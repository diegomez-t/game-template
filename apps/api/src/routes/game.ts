import { GameRepository, GameHistoryRepository } from "@template/database"
import { Hono } from "hono"
import { RoomManager } from "../socket/RoomManager.js"

export const gameRoutes = new Hono()

/**
 * GET /api/games - Liste des parties publiques
 */
gameRoutes.get("/", async (c) => {
  const lobbies = await GameRepository.findPublicLobbies()

  return c.json({ games: lobbies })
})

/**
 * GET /api/games/:code - Détails d'une partie par code
 */
gameRoutes.get("/:code", async (c) => {
  const code = c.req.param("code").toUpperCase()

  // Essayer d'abord dans le cache (parties actives)
  const roomManager = RoomManager.getInstance()
  const room = roomManager.getRoom(code)

  if (room) {
    return c.json({
      game: room.getState(),
      source: "active",
    })
  }

  // Sinon, chercher dans la base de données
  const game = await GameRepository.findByCode(code)
  if (!game) {
    return c.json({ error: "Game not found" }, 404)
  }

  return c.json({ game, source: "database" })
})

/**
 * GET /api/games/history/:gameId - Historique d'une partie terminée
 */
gameRoutes.get("/history/:gameId", async (c) => {
  const gameId = c.req.param("gameId")

  const history = await GameHistoryRepository.findByGameId(gameId)
  if (!history) {
    return c.json({ error: "Game history not found" }, 404)
  }

  return c.json({ history })
})

/**
 * GET /api/games/stats/global - Statistiques globales
 */
gameRoutes.get("/stats/global", async (c) => {
  const stats = await GameHistoryRepository.getGlobalStats()
  const roomManager = RoomManager.getInstance()

  return c.json({
    ...stats,
    activeRooms: roomManager.getRoomCount(),
    activePlayers: roomManager.getTotalPlayerCount(),
  })
})

/**
 * GET /api/games/recent - Parties récentes terminées
 */
gameRoutes.get("/recent", async (c) => {
  const limit = parseInt(c.req.query("limit") || "20")
  const recent = await GameHistoryRepository.getRecent(limit)

  return c.json({ games: recent })
})

