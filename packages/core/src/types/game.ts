import type { GamePhase, GameStatus } from "../constants.js"
import type { PlayerState } from "./player.js"

/**
 * Configuration de base d'un jeu
 * À étendre selon les besoins spécifiques du jeu
 */
export interface GameSettings {
  minPlayers: number
  maxPlayers: number
  turnTimeoutMs: number
  reconnectTimeoutMs: number
  isPrivate: boolean
  // Paramètres spécifiques au jeu à ajouter ici
  [key: string]: unknown
}

/**
 * État du jeu à un moment donné
 */
export interface GameState {
  id: string
  code: string
  status: GameStatus
  phase: GamePhase
  hostId: string
  currentPlayerId: string | null
  players: PlayerState[]
  settings: GameSettings
  roundNumber: number
  turnNumber: number
  createdAt: Date
  updatedAt: Date
  startedAt: Date | null
  endedAt: Date | null
  // État spécifique au jeu (cartes, plateau, etc.)
  gameData: Record<string, unknown>
}

/**
 * Résultat d'une partie
 */
export interface GameResult {
  gameId: string
  winnerId: string | null
  winnerIds?: string[] // Pour les jeux en équipe
  rankings: PlayerRanking[]
  duration: number
  rounds: number
  endReason: "completed" | "forfeit" | "timeout" | "cancelled"
}

/**
 * Classement d'un joueur
 */
export interface PlayerRanking {
  playerId: string
  rank: number
  score: number
  stats: Record<string, number>
}

/**
 * Historique d'une action de jeu
 */
export interface GameAction {
  id: string
  gameId: string
  playerId: string
  type: string
  data: Record<string, unknown>
  timestamp: Date
}

/**
 * Configuration pour créer une nouvelle partie
 */
export interface CreateGameOptions {
  hostId: string
  settings?: Partial<GameSettings>
}

/**
 * Données pour rejoindre une partie
 */
export interface JoinGameData {
  gameCode: string
  playerId: string
  playerName: string
  avatar?: string
}

