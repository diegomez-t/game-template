import mongoose from "mongoose"

let isConnected = false

export interface DBConfig {
  uri: string
  dbName?: string
}

/**
 * Connexion à MongoDB
 */
export async function connectDB(config: DBConfig): Promise<void> {
  if (isConnected) {
    console.log("MongoDB: Déjà connecté")
    return
  }

  try {
    const options = {
      dbName: config.dbName,
    }

    await mongoose.connect(config.uri, options)
    isConnected = true
    console.log("MongoDB: Connexion établie")

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB: Erreur de connexion", err)
    })

    mongoose.connection.on("disconnected", () => {
      isConnected = false
      console.log("MongoDB: Déconnecté")
    })
  } catch (error) {
    console.error("MongoDB: Échec de la connexion", error)
    throw error
  }
}

/**
 * Déconnexion de MongoDB
 */
export async function disconnectDB(): Promise<void> {
  if (!isConnected) return

  try {
    await mongoose.disconnect()
    isConnected = false
    console.log("MongoDB: Déconnecté proprement")
  } catch (error) {
    console.error("MongoDB: Erreur lors de la déconnexion", error)
    throw error
  }
}

/**
 * État de la connexion
 */
export function getConnectionState(): {
  isConnected: boolean
  readyState: number
  host?: string
  name?: string
} {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  }
}

