import type { CardData, CardJSON, CardSuit, CardValue } from "../types/card.js"

export interface CardConfig {
  value: CardValue
  suit?: CardSuit
  isVisible?: boolean
  metadata?: Record<string, unknown>
}

/**
 * Classe représentant une carte de jeu
 * Extensible pour différents types de jeux
 */
export class Card implements CardData {
  readonly id: string
  value: CardValue
  suit?: CardSuit
  isVisible: boolean
  isPlayable: boolean
  metadata: Record<string, unknown>

  constructor(config: CardConfig) {
    this.id = crypto.randomUUID()
    this.value = config.value
    this.suit = config.suit
    this.isVisible = config.isVisible ?? false
    this.isPlayable = true
    this.metadata = config.metadata ?? {}
  }

  /**
   * Retourne la carte face visible
   */
  reveal(): void {
    this.isVisible = true
  }

  /**
   * Cache la carte
   */
  hide(): void {
    this.isVisible = false
  }

  /**
   * Définit si la carte peut être jouée
   */
  setPlayable(playable: boolean): void {
    this.isPlayable = playable
  }

  /**
   * Clone la carte
   */
  clone(): Card {
    const card = new Card({
      value: this.value,
      suit: this.suit,
      isVisible: this.isVisible,
      metadata: { ...this.metadata },
    })
    return card
  }

  /**
   * Sérialise la carte pour le client
   * Cache la valeur si la carte n'est pas visible
   */
  toJSON(): CardJSON {
    return {
      id: this.id,
      value: this.isVisible ? this.value : undefined,
      suit: this.isVisible ? this.suit : undefined,
      isVisible: this.isVisible,
    }
  }

  /**
   * Sérialise la carte complète (pour le serveur)
   */
  toFullJSON(): CardData {
    return {
      id: this.id,
      value: this.value,
      suit: this.suit,
      isVisible: this.isVisible,
      isPlayable: this.isPlayable,
      metadata: this.metadata,
    }
  }

  /**
   * Crée une carte depuis des données
   */
  static fromData(data: CardData): Card {
    const card = new Card({
      value: data.value,
      suit: data.suit,
      isVisible: data.isVisible,
      metadata: data.metadata,
    })
    ;(card as { id: string }).id = data.id
    card.isPlayable = data.isPlayable
    return card
  }

  /**
   * Compare deux cartes par valeur
   */
  static compareByValue(a: Card, b: Card): number {
    if (typeof a.value === "number" && typeof b.value === "number") {
      return a.value - b.value
    }
    return String(a.value).localeCompare(String(b.value))
  }
}

