import mongoose from "mongoose"
import { Game, type IGame } from "../models/Game.js"

export interface CreateGameDTO {
  code: string
  hostId: string
  settings?: Partial<IGame["settings"]>
}

export interface AddPlayerDTO {
  odayerId: string
  odayserRefId?: string
  name: string
  avatar?: string
}

/**
 * Repository pour les opérations sur les parties
 */
export class GameRepository {
  /**
   * Crée une nouvelle partie
   */
  static async create(data: CreateGameDTO): Promise<IGame> {
    const game = new Game({
      code: data.code.toUpperCase(),
      hostId: new mongoose.Types.ObjectId(data.hostId),
      settings: data.settings,
    })
    await game.save()
    return game
  }

  /**
   * Trouve une partie par code
   */
  static async findByCode(code: string): Promise<IGame | null> {
    return Game.findOne({ code: code.toUpperCase() })
  }

  /**
   * Trouve une partie par ID
   */
  static async findById(id: string): Promise<IGame | null> {
    return Game.findById(id)
  }

  /**
   * Trouve les parties actives d'un joueur
   */
  static async findActiveByPlayer(odayerId: string): Promise<IGame[]> {
    return Game.find({
      "players.odayerId": odayerId,
      status: { $in: ["lobby", "playing", "paused"] },
    })
  }

  /**
   * Trouve les parties publiques en lobby
   */
  static async findPublicLobbies(limit = 20): Promise<IGame[]> {
    return Game.find({
      status: "lobby",
      "settings.isPrivate": false,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("code players settings createdAt")
  }

  /**
   * Ajoute un joueur à une partie
   */
  static async addPlayer(
    gameId: string,
    player: AddPlayerDTO
  ): Promise<IGame | null> {
    return Game.findByIdAndUpdate(
      gameId,
      {
        $push: {
          players: {
            ...player,
            odayserRefId: player.odayserRefId
              ? new mongoose.Types.ObjectId(player.odayserRefId)
              : undefined,
            joinedAt: new Date(),
          },
        },
      },
      { new: true }
    )
  }

  /**
   * Retire un joueur d'une partie
   */
  static async removePlayer(
    gameId: string,
    odayerId: string
  ): Promise<IGame | null> {
    return Game.findByIdAndUpdate(
      gameId,
      { $pull: { players: { odayerId } } },
      { new: true }
    )
  }

  /**
   * Met à jour le score d'un joueur
   */
  static async updatePlayerScore(
    gameId: string,
    odayerId: string,
    score: number
  ): Promise<IGame | null> {
    return Game.findOneAndUpdate(
      { _id: gameId, "players.odayerId": odayerId },
      { $set: { "players.$.score": score } },
      { new: true }
    )
  }

  /**
   * Met à jour le statut d'une partie
   */
  static async updateStatus(
    gameId: string,
    status: IGame["status"]
  ): Promise<IGame | null> {
    const updateData: Record<string, unknown> = { status }

    if (status === "playing") {
      updateData.startedAt = new Date()
    } else if (status === "finished" || status === "cancelled") {
      updateData.endedAt = new Date()
    }

    return Game.findByIdAndUpdate(gameId, { $set: updateData }, { new: true })
  }

  /**
   * Met à jour l'état du jeu
   */
  static async updateGameState(
    gameId: string,
    gameState: Record<string, unknown>
  ): Promise<IGame | null> {
    return Game.findByIdAndUpdate(
      gameId,
      { $set: { gameState, updatedAt: new Date() } },
      { new: true }
    )
  }

  /**
   * Met à jour les paramètres
   */
  static async updateSettings(
    gameId: string,
    settings: Partial<IGame["settings"]>
  ): Promise<IGame | null> {
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(settings)) {
      updateData[`settings.${key}`] = value
    }

    return Game.findByIdAndUpdate(gameId, { $set: updateData }, { new: true })
  }

  /**
   * Incrémente le numéro de manche/tour
   */
  static async incrementRound(gameId: string): Promise<IGame | null> {
    return Game.findByIdAndUpdate(
      gameId,
      { $inc: { roundNumber: 1 }, $set: { turnNumber: 0 } },
      { new: true }
    )
  }

  static async incrementTurn(gameId: string): Promise<IGame | null> {
    return Game.findByIdAndUpdate(
      gameId,
      { $inc: { turnNumber: 1 } },
      { new: true }
    )
  }

  /**
   * Supprime une partie
   */
  static async delete(gameId: string): Promise<boolean> {
    const result = await Game.findByIdAndDelete(gameId)
    return result !== null
  }

  /**
   * Supprime les anciennes parties en lobby
   */
  static async cleanupOldLobbies(maxAgeHours = 24): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)
    const result = await Game.deleteMany({
      status: "lobby",
      createdAt: { $lt: cutoff },
    })
    return result.deletedCount
  }

  /**
   * Vérifie si un code existe
   */
  static async codeExists(code: string): Promise<boolean> {
    const count = await Game.countDocuments({ code: code.toUpperCase() })
    return count > 0
  }
}

