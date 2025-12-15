import mongoose, { Schema, type Document } from "mongoose"

/**
 * Interface pour l'historique des parties terminées
 */
export interface IGameHistory extends Document {
  _id: mongoose.Types.ObjectId
  gameId: string
  gameCode: string
  
  // Résultat
  winner: {
    odayerId: string
    userRefId?: mongoose.Types.ObjectId
    name: string
    score: number
  } | null
  
  // Classement final
  rankings: {
    rank: number
    odayerId: string
    userRefId?: mongoose.Types.ObjectId
    name: string
    score: number
    stats: Record<string, number>
  }[]
  
  // Statistiques de la partie
  stats: {
    duration: number // en secondes
    rounds: number
    turns: number
    [key: string]: number
  }
  
  // Configuration utilisée
  settings: Record<string, unknown>
  
  // Raison de fin
  endReason: "completed" | "forfeit" | "timeout" | "cancelled"
  
  // Dates
  startedAt: Date
  endedAt: Date
  createdAt: Date
}

const RankingSubSchema = new Schema(
  {
    rank: { type: Number, required: true },
    odayerId: { type: String, required: true },
    userRefId: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    score: { type: Number, required: true },
    stats: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false }
)

const GameHistorySchema = new Schema<IGameHistory>(
  {
    gameId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gameCode: {
      type: String,
      required: true,
    },
    winner: {
      odayerId: String,
      userRefId: { type: Schema.Types.ObjectId, ref: "User" },
      name: String,
      score: Number,
    },
    rankings: [RankingSubSchema],
    stats: {
      duration: { type: Number, required: true },
      rounds: { type: Number, required: true },
      turns: { type: Number, required: true },
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    endReason: {
      type: String,
      enum: ["completed", "forfeit", "timeout", "cancelled"],
      required: true,
    },
    startedAt: { type: Date, required: true },
    endedAt: { type: Date, required: true },
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

// Index pour les statistiques et recherches
GameHistorySchema.index({ endedAt: -1 })
GameHistorySchema.index({ "rankings.userRefId": 1, endedAt: -1 })
GameHistorySchema.index({ "winner.userRefId": 1 })

// Méthodes statiques pour les statistiques
GameHistorySchema.statics.getPlayerStats = async function (userId: string) {
  return this.aggregate([
    { $match: { "rankings.userRefId": new mongoose.Types.ObjectId(userId) } },
    { $unwind: "$rankings" },
    { $match: { "rankings.userRefId": new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        gamesPlayed: { $sum: 1 },
        wins: { $sum: { $cond: [{ $eq: ["$rankings.rank", 1] }, 1, 0] } },
        totalScore: { $sum: "$rankings.score" },
        totalDuration: { $sum: "$stats.duration" },
      },
    },
  ])
}

export const GameHistory = mongoose.model<IGameHistory>("GameHistory", GameHistorySchema)

