import type { FilterQuery } from "mongoose"
import { User, type IUser } from "../models/User.js"

export interface CreateUserDTO {
  username: string
  email?: string
  passwordHash?: string
  avatar?: string
  isGuest?: boolean
  oauthProvider?: "google" | "facebook" | "discord"
  oauthId?: string
}

export interface UpdateUserDTO {
  username?: string
  email?: string
  avatar?: string
  settings?: Partial<IUser["settings"]>
}

/**
 * Repository pour les opérations sur les utilisateurs
 */
export class UserRepository {
  /**
   * Crée un nouvel utilisateur
   */
  static async create(data: CreateUserDTO): Promise<IUser> {
    const user = new User(data)
    await user.save()
    return user
  }

  /**
   * Trouve un utilisateur par ID
   */
  static async findById(id: string): Promise<IUser | null> {
    return User.findById(id)
  }

  /**
   * Trouve un utilisateur par username
   */
  static async findByUsername(username: string): Promise<IUser | null> {
    return User.findOne({ username: { $regex: new RegExp(`^${username}$`, "i") } })
  }

  /**
   * Trouve un utilisateur par email
   */
  static async findByEmail(email: string): Promise<IUser | null> {
    return User.findOne({ email: email.toLowerCase() })
  }

  /**
   * Trouve un utilisateur par OAuth
   */
  static async findByOAuth(
    provider: string,
    oauthId: string
  ): Promise<IUser | null> {
    return User.findOne({ oauthProvider: provider, oauthId })
  }

  /**
   * Met à jour un utilisateur
   */
  static async update(id: string, data: UpdateUserDTO): Promise<IUser | null> {
    const updateData: Record<string, unknown> = {}

    if (data.username) updateData.username = data.username
    if (data.email) updateData.email = data.email.toLowerCase()
    if (data.avatar) updateData.avatar = data.avatar

    if (data.settings) {
      for (const [key, value] of Object.entries(data.settings)) {
        updateData[`settings.${key}`] = value
      }
    }

    return User.findByIdAndUpdate(id, { $set: updateData }, { new: true })
  }

  /**
   * Met à jour les statistiques d'un utilisateur
   */
  static async updateStats(
    id: string,
    stats: Partial<IUser["stats"]>
  ): Promise<IUser | null> {
    const updateData: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(stats)) {
      if (typeof value === "number") {
        updateData[`stats.${key}`] = value
      }
    }

    return User.findByIdAndUpdate(
      id,
      { $inc: updateData },
      { new: true }
    )
  }

  /**
   * Met à jour la dernière connexion
   */
  static async updateLastLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, { lastLoginAt: new Date() })
  }

  /**
   * Supprime un utilisateur
   */
  static async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id)
    return result !== null
  }

  /**
   * Recherche d'utilisateurs
   */
  static async search(
    query: string,
    limit = 10
  ): Promise<IUser[]> {
    return User.find({
      username: { $regex: query, $options: "i" },
    })
      .limit(limit)
      .select("username avatar stats.gamesWon")
  }

  /**
   * Classement des joueurs
   */
  static async getLeaderboard(
    sortBy: keyof IUser["stats"] = "gamesWon",
    limit = 100
  ): Promise<IUser[]> {
    return User.find({ isGuest: false })
      .sort({ [`stats.${sortBy}`]: -1 })
      .limit(limit)
      .select("username avatar stats")
  }

  /**
   * Compte le nombre d'utilisateurs
   */
  static async count(filter?: FilterQuery<IUser>): Promise<number> {
    return User.countDocuments(filter)
  }

  /**
   * Vérifie si un username existe
   */
  static async usernameExists(username: string): Promise<boolean> {
    const count = await User.countDocuments({
      username: { $regex: new RegExp(`^${username}$`, "i") },
    })
    return count > 0
  }

  /**
   * Vérifie si un email existe
   */
  static async emailExists(email: string): Promise<boolean> {
    const count = await User.countDocuments({ email: email.toLowerCase() })
    return count > 0
  }
}

