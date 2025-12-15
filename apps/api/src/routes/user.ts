import { UserRepository, GameHistoryRepository } from "@template/database"
import { updateProfileSchema, validate } from "@template/shared"
import { Hono } from "hono"

export const userRoutes = new Hono()

/**
 * GET /api/users/:id - Profil utilisateur
 */
userRoutes.get("/:id", async (c) => {
  const id = c.req.param("id")

  const user = await UserRepository.findById(id)
  if (!user) {
    return c.json({ error: "User not found" }, 404)
  }

  return c.json({ user })
})

/**
 * PATCH /api/users/:id - Mise à jour du profil
 */
userRoutes.patch("/:id", async (c) => {
  const id = c.req.param("id")
  const body = await c.req.json()

  // TODO: Vérifier que l'utilisateur est authentifié et c'est son profil

  const validation = validate(updateProfileSchema, body)
  if (!validation.success) {
    return c.json({ error: "Validation error", details: validation.errors }, 400)
  }

  const user = await UserRepository.update(id, validation.data)
  if (!user) {
    return c.json({ error: "User not found" }, 404)
  }

  return c.json({ user })
})

/**
 * GET /api/users/:id/stats - Statistiques d'un joueur
 */
userRoutes.get("/:id/stats", async (c) => {
  const id = c.req.param("id")

  const user = await UserRepository.findById(id)
  if (!user) {
    return c.json({ error: "User not found" }, 404)
  }

  const detailedStats = await GameHistoryRepository.getPlayerStats(id)

  return c.json({
    stats: user.stats,
    detailed: detailedStats,
  })
})

/**
 * GET /api/users/:id/history - Historique des parties
 */
userRoutes.get("/:id/history", async (c) => {
  const id = c.req.param("id")
  const limit = parseInt(c.req.query("limit") || "20")
  const skip = parseInt(c.req.query("skip") || "0")

  const history = await GameHistoryRepository.findByPlayer(id, { limit, skip })
  const total = await GameHistoryRepository.countByPlayer(id)

  return c.json({ history, total, limit, skip })
})

/**
 * GET /api/users/leaderboard - Classement
 */
userRoutes.get("/leaderboard", async (c) => {
  const sortBy = (c.req.query("sortBy") as "gamesWon" | "totalScore") || "gamesWon"
  const limit = parseInt(c.req.query("limit") || "100")

  const leaderboard = await UserRepository.getLeaderboard(sortBy, limit)

  return c.json({ leaderboard })
})

/**
 * GET /api/users/search - Recherche d'utilisateurs
 */
userRoutes.get("/search", async (c) => {
  const query = c.req.query("q")
  if (!query || query.length < 2) {
    return c.json({ error: "Query too short" }, 400)
  }

  const users = await UserRepository.search(query)

  return c.json({ users })
})

