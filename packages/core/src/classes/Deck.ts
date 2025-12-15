import type { CardConfig, DeckState, DrawResult } from "../types/card.js"
import { Card } from "./Card.js"

/**
 * Classe gérant un deck de cartes
 */
export class Deck {
  private drawPile: Card[] = []
  private discardPile: Card[] = []
  private inPlayCards: Card[] = []

  constructor(cardConfigs?: CardConfig[], shuffleOnCreate = true) {
    if (cardConfigs) {
      this.drawPile = cardConfigs.map((config) => new Card(config))
      if (shuffleOnCreate) {
        this.shuffle()
      }
    }
  }

  /**
   * Nombre de cartes dans la pioche
   */
  get drawPileCount(): number {
    return this.drawPile.length
  }

  /**
   * Nombre de cartes dans la défausse
   */
  get discardPileCount(): number {
    return this.discardPile.length
  }

  /**
   * Carte du dessus de la défausse
   */
  get topDiscardCard(): Card | undefined {
    return this.discardPile[this.discardPile.length - 1]
  }

  /**
   * Mélange le deck (algorithme Fisher-Yates)
   */
  shuffle(times = 3): void {
    for (let t = 0; t < times; t++) {
      for (let i = this.drawPile.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[this.drawPile[i], this.drawPile[j]] = [this.drawPile[j]!, this.drawPile[i]!]
      }
    }
  }

  /**
   * Pioche une carte
   */
  draw(): DrawResult | null {
    if (this.drawPile.length === 0) {
      this.reshuffleDiscard()
    }

    const card = this.drawPile.shift()
    if (!card) return null

    return {
      card: card.toFullJSON(),
      remainingCards: this.drawPile.length,
    }
  }

  /**
   * Pioche plusieurs cartes
   */
  drawMany(count: number): Card[] {
    const cards: Card[] = []
    for (let i = 0; i < count; i++) {
      if (this.drawPile.length === 0) {
        this.reshuffleDiscard()
      }
      const card = this.drawPile.shift()
      if (card) cards.push(card)
    }
    return cards
  }

  /**
   * Ajoute une carte à la défausse
   */
  discard(card: Card): void {
    card.reveal()
    this.discardPile.push(card)
  }

  /**
   * Ajoute plusieurs cartes à la défausse
   */
  discardMany(cards: Card[]): void {
    for (const card of cards) {
      this.discard(card)
    }
  }

  /**
   * Prend la carte du dessus de la défausse
   */
  takeFromDiscard(): Card | undefined {
    return this.discardPile.pop()
  }

  /**
   * Remet la défausse dans la pioche et mélange
   */
  reshuffleDiscard(): void {
    if (this.discardPile.length === 0) return

    // Garde la dernière carte visible sur la défausse
    const topCard = this.discardPile.pop()

    // Mélange le reste dans la pioche
    for (const card of this.discardPile) {
      card.hide()
    }
    this.drawPile = [...this.discardPile, ...this.drawPile]
    this.discardPile = topCard ? [topCard] : []
    this.shuffle()
  }

  /**
   * Ajoute des cartes au deck
   */
  addCards(cards: Card[]): void {
    this.drawPile.push(...cards)
  }

  /**
   * Retourne l'état complet du deck
   */
  getState(): DeckState {
    return {
      drawPile: this.drawPile.map((c) => c.toFullJSON()),
      discardPile: this.discardPile.map((c) => c.toFullJSON()),
      inPlay: this.inPlayCards.map((c) => c.toFullJSON()),
    }
  }

  /**
   * Restaure l'état du deck depuis des données
   */
  setState(state: DeckState): void {
    this.drawPile = state.drawPile.map((data) => Card.fromData(data))
    this.discardPile = state.discardPile.map((data) => Card.fromData(data))
    this.inPlayCards = state.inPlay.map((data) => Card.fromData(data))
  }

  /**
   * Réinitialise le deck
   */
  reset(): void {
    this.drawPile = [...this.drawPile, ...this.discardPile, ...this.inPlayCards]
    this.discardPile = []
    this.inPlayCards = []
    for (const card of this.drawPile) {
      card.hide()
    }
    this.shuffle()
  }

  /**
   * Crée un deck standard de 52 cartes
   */
  static createStandardDeck(): Deck {
    const suits = ["hearts", "diamonds", "clubs", "spades"] as const
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

    const cards: CardConfig[] = []
    for (const suit of suits) {
      for (const value of values) {
        cards.push({ value, suit })
      }
    }

    return new Deck(cards, true)
  }

  /**
   * Crée un deck personnalisé avec des valeurs répétées
   */
  static createCustomDeck(config: { value: number; count: number }[]): Deck {
    const cards: CardConfig[] = []
    for (const { value, count } of config) {
      for (let i = 0; i < count; i++) {
        cards.push({ value })
      }
    }
    return new Deck(cards, true)
  }
}

