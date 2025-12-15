import mongoose from "mongoose"
import { GameHistory, type IGameHistory } from "../models/GameHistory.js"

export interface CreateGameHistoryDTO {
  gameId: string
  gameCode: string
  winner: {
    odayerId: string
    userRefId?: string
    name: string
    score: number
  } | null
  rankings: {
    rank: number
    odayerId: string
    userRefId?: string
    name: string
    score: number
    stats?: Record<string, number>
  }[]
  stats: {
    duration: number
    rounds: number
    turns: number
    [key: string]: number
  }
  settings: Record<string, unknown>
  endReason: "completed" | "forfeit" | "timeout" | "cancelled"
  startedAt: Date
  endedAt: Date
}

/**
 * Repository pour l'historique des parties
 */
export class GameHistoryRepository {
  /**
   * Crée un enregistrement d'historique
   */
  static async create(data: CreateGameHistoryDTO): Promise<IGameHistory> {
    const history = new GameHistory({
      ...data,
      winner: data.winner
        ? {
            ...data.winner,
            userRefId: data.winner.userRefId
              ? new mongoose.Types.ObjectId(data.winner.userRefId)
              : undefined,
          }
        : null,
      rankings: data.rankings.map((r) => ({
        ...r,
        userRefId: r.userRefId
          ? new mongoose.Types.ObjectId(r.userRefId)
          : undefined,
        stats: r.stats ?? {},
      })),
    })
    await history.save()
    return history
  }

  /**
   * Trouve un historique par gameId
   */
  static async findByGameId(gameId: string): Promise<IGameHistory | null> {
    return GameHistory.findOne({ gameId })
  }

  /**
   * Historique des parties d'un joueur
   */
  static async findByPlayer(
    userId: string,
    options: { limit?: number; skip?: number } = {}
  ): Promise<IGameHistory[]> {
    const { limit = 20, skip = 0 } = options

    return GameHistory.find({
      "rankings.userRefId": new mongoose.Types.ObjectId(userId),
    })
      .sort({ endedAt: -1 })
      .skip(skip)
      .limit(limit)
  }

  /**
   * Nombre de parties d'un joueur
   */
  static async countByPlayer(userId: string): Promise<number> {
    return GameHistory.countDocuments({
      "rankings.userRefId": new mongoose.Types.ObjectId(userId),
    })
  }

  /**
   * Statistiques agrégées d'un joueur
   */
  static async getPlayerStats(userId: string): Promise<{
    gamesPlayed: number
    wins: number
    winRate: number
    totalScore: number
    avgScore: number
    totalDuration: number
    avgDuration: number
  } | null> {
    const result = await GameHistory.aggregate([
      {
        $match: {
          "rankings.userRefId": new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: "$rankings" },
      {
        $match: {
          "rankings.userRefId": new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: null,
          gamesPlayed: { $sum: 1 },
          wins: {
            $sum: { $cond: [{ $eq: ["$rankings.rank", 1] }, 1, 0] },
          },
          totalScore: { $sum: "$rankings.score" },
          totalDuration: { $sum: "$stats.duration" },
        },
      },
    ])

    if (result.length === 0) return null

    const stats = result[0]
    return {
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      winRate:
        stats.gamesPlayed > 0
          ? Math.round((stats.wins / stats.gamesPlayed) * 100)
          : 0,
      totalScore: stats.totalScore,
      avgScore:
        stats.gamesPlayed > 0
          ? Math.round(stats.totalScore / stats.gamesPlayed)
          : 0,
      totalDuration: stats.totalDuration,
      avgDuration:
        stats.gamesPlayed > 0
          ? Math.round(stats.totalDuration / stats.gamesPlayed)
          : 0,
    }
  }

  /**
   * Meilleures parties par score
   */
  static async getTopScores(limit = 10): Promise<IGameHistory[]> {
    return GameHistory.find({
      endReason: "completed",
    })
      .sort({ "winner.score": -1 })
      .limit(limit)
  }

  /**
   * Parties récentes
   */
  static async getRecent(limit = 20): Promise<IGameHistory[]> {
    return GameHistory.find()
      .sort({ endedAt: -1 })
      .limit(limit)
  }

  /**
   * Statistiques globales
   */
  static async getGlobalStats(): Promise<{
    totalGames: number
    totalPlayers: number
    avgGameDuration: number
    avgRounds: number
  }> {
    const result = await GameHistory.aggregate([
      {
        $group: {
          _id: null,
          totalGames: { $sum: 1 },
          totalPlayers: { $sum: { $size: "$rankings" } },
          totalDuration: { $sum: "$stats.duration" },
          totalRounds: { $sum: "$stats.rounds" },
        },
      },
    ])

    if (result.length === 0) {
      return {
        totalGames: 0,
        totalPlayers: 0,
        avgGameDuration: 0,
        avgRounds: 0,
      }
    }

    const stats = result[0]
    return {
      totalGames: stats.totalGames,
      totalPlayers: stats.totalPlayers,
      avgGameDuration:
        stats.totalGames > 0
          ? Math.round(stats.totalDuration / stats.totalGames)
          : 0,
      avgRounds:
        stats.totalGames > 0
          ? Math.round(stats.totalRounds / stats.totalGames)
          : 0,
    }
  }
}

