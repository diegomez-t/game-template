import { serve } from "@hono/node-server"
import { connectDB, disconnectDB } from "@template/database"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { ENV } from "./env.js"
import { authRoutes } from "./routes/auth.js"
import { gameRoutes } from "./routes/game.js"
import { userRoutes } from "./routes/user.js"
import { initializeSocketServer } from "./socket/index.js"
import { RoomManager } from "./socket/RoomManager.js"

const app = new Hono()

// Middlewares
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: ENV.CORS_ORIGIN,
    credentials: true,
  })
)

// Health check
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    rooms: RoomManager.getInstance().getRoomCount(),
  })
})

// Routes API
app.route("/api/auth", authRoutes)
app.route("/api/users", userRoutes)
app.route("/api/games", gameRoutes)

// Error handling
app.onError((err, c) => {
  console.error("Error:", err)
  return c.json(
    {
      error: "Internal Server Error",
      message: ENV.NODE_ENV === "development" ? err.message : undefined,
    },
    500
  )
})

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404)
})

// Server
let server: ReturnType<typeof serve> | null = null

async function startServer() {
  try {
    // Connexion MongoDB
    await connectDB({ uri: ENV.MONGODB_URI })
    console.log("✅ MongoDB connecté")

    // Démarrage du serveur HTTP
    server = serve({
      fetch: app.fetch,
      port: ENV.PORT,
    })

    // Initialisation Socket.IO
    await initializeSocketServer(server)
    console.log("✅ Socket.IO initialisé")

    console.log(`🚀 Serveur démarré sur le port ${ENV.PORT}`)
  } catch (error) {
    console.error("❌ Erreur au démarrage:", error)
    process.exit(1)
  }
}

// Graceful shutdown
async function shutdown(signal: string) {
  console.log(`\n${signal} reçu, arrêt en cours...`)

  try {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve())
      })
    }

    await disconnectDB()
    console.log("✅ Arrêt propre effectué")
    process.exit(0)
  } catch (error) {
    console.error("❌ Erreur lors de l'arrêt:", error)
    process.exit(1)
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))

startServer()

