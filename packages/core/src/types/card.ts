/**
 * Types de cartes (à personnaliser selon le jeu)
 */
export type CardSuit = "hearts" | "diamonds" | "clubs" | "spades" | "special" | string

export type CardValue = number | string

/**
 * Représentation d'une carte
 */
export interface CardData {
  id: string
  value: CardValue
  suit?: CardSuit
  isVisible: boolean
  isPlayable: boolean
  metadata?: Record<string, unknown>
}

/**
 * Configuration d'une carte
 */
export interface CardConfig {
  value: CardValue
  suit?: CardSuit
  isVisible?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Configuration du deck
 */
export interface DeckConfig {
  cards: CardConfig[]
  shuffleOnCreate?: boolean
}

/**
 * État d'un deck
 */
export interface DeckState {
  drawPile: CardData[]
  discardPile: CardData[]
  inPlay: CardData[]
}

/**
 * Données JSON d'une carte (pour envoi client)
 */
export interface CardJSON {
  id: string
  value?: CardValue // undefined si non visible
  suit?: CardSuit
  isVisible: boolean
}

/**
 * Zone de jeu pour les cartes
 */
export interface CardZone {
  id: string
  name: string
  cards: CardData[]
  maxCards?: number
  isPublic: boolean
}

/**
 * Main d'un joueur
 */
export interface PlayerHand {
  playerId: string
  cards: CardData[]
  maxCards?: number
}

/**
 * Résultat d'un tirage de carte
 */
export interface DrawResult {
  card: CardData
  remainingCards: number
}

/**
 * Action sur une carte
 */
export interface CardAction {
  type: "play" | "discard" | "draw" | "reveal" | "hide" | "move"
  cardId: string
  sourceZone?: string
  targetZone?: string
  data?: Record<string, unknown>
}

