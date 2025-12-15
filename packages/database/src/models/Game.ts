import mongoose, { Schema, type Document } from "mongoose"

/**
 * Interface pour une partie en cours (cache Redis préféré pour les parties actives)
 * Cette collection est pour la persistance et l'historique
 */
export interface IGame extends Document {
  _id: mongoose.Types.ObjectId
  code: string
  status: "lobby" | "playing" | "paused" | "finished" | "cancelled"
  
  // Hôte
  hostId: mongoose.Types.ObjectId
  
  // Joueurs
  players: {
    odayerId: string
    odayserRefId?: mongoose.Types.ObjectId // Référence User si connecté
    name: string
    avatar?: string
    score: number
    isConnected: boolean
    joinedAt: Date
  }[]
  
  // Configuration
  settings: {
    minPlayers: number
    maxPlayers: number
    turnTimeoutMs: number
    isPrivate: boolean
    [key: string]: unknown
  }
  
  // État du jeu (données spécifiques au type de jeu)
  gameState: Record<string, unknown>
  
  // Métadonnées
  roundNumber: number
  turnNumber: number
  
  // Dates
  startedAt?: Date
  endedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PlayerSubSchema = new Schema(
  {
    odayerId: { type: String, required: true },
    odayserRefId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    avatar: String,
    score: { type: Number, default: 0 },
    isConnected: { type: Boolean, default: true },
    joinedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const GameSchema = new Schema<IGame>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["lobby", "playing", "paused", "finished", "cancelled"],
      default: "lobby",
      index: true,
    },
    hostId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    players: [PlayerSubSchema],
    settings: {
      minPlayers: { type: Number, default: 2 },
      maxPlayers: { type: Number, default: 8 },
      turnTimeoutMs: { type: Number, default: 60000 },
      isPrivate: { type: Boolean, default: false },
    },
    gameState: {
      type: Schema.Types.Mixed,
      default: {},
    },
    roundNumber: { type: Number, default: 0 },
    turnNumber: { type: Number, default: 0 },
    startedAt: Date,
    endedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        return ret
      },
    },
  }
)

// Index pour les recherches
GameSchema.index({ status: 1, createdAt: -1 })
GameSchema.index({ "players.odayerId": 1 })
GameSchema.index({ hostId: 1 })

// TTL pour nettoyer les anciennes parties (30 jours après fin)
GameSchema.index({ endedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 })

export const Game = mongoose.model<IGame>("Game", GameSchema)

