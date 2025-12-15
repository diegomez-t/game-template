import {
  GAME_PHASE,
  GAME_STATUS,
} from "../constants.js"
import type { CreateGameOptions } from "../types/game.js"
import { Game, type GameConfig } from "../classes/Game.js"
import { Deck } from "../classes/Deck.js"
import type { Player } from "../classes/Player.js"

/**
 * Exemple de jeu de cartes simple
 * Chaque joueur pioche une carte à son tour et essaie d'avoir le score le plus bas
 */
export class SimpleCardGame extends Game {
  private deck: Deck
  private roundsToPlay: number = 3
  private currentRound: number = 1

  constructor(options: CreateGameOptions, config?: GameConfig) {
    super(options, {
      minPlayers: 2,
      maxPlayers: 6,
      turnTimeoutMs: 30000,
      ...config,
    })

    // Créer un deck personnalisé avec des cartes de -2 à 12
    this.deck = Deck.createCustomDeck([
      { value: -2, count: 5 },
      { value: -1, count: 10 },
      { value: 0, count: 15 },
      { value: 1, count: 10 },
      { value: 2, count: 10 },
      { value: 3, count: 10 },
      { value: 4, count: 10 },
      { value: 5, count: 10 },
      { value: 6, count: 10 },
      { value: 7, count: 10 },
      { value: 8, count: 10 },
      { value: 9, count: 10 },
      { value: 10, count: 10 },
      { value: 11, count: 10 },
      { value: 12, count: 10 },
    ])
  }

  /**
   * Initialise la partie
   */
  async initializeGame(): Promise<void> {
    this.deck.reset()
    this._phase = GAME_PHASE.DEAL

    // Distribuer 4 cartes à chaque joueur (face cachée)
    for (const player of this.connectedPlayers) {
      const cards = this.deck.drawMany(4)
      player.setHand(cards)
      
      // Révéler 2 cartes
      if (cards.length >= 2) {
        cards[0]!.reveal()
        cards[1]!.reveal()
      }
    }

    // Retourner une carte sur la défausse
    const firstCard = this.deck.draw()
    if (firstCard) {
      this.deck.discard(
        (await import("../classes/Card.js")).Card.fromData(firstCard.card)
      )
    }

    this._phase = GAME_PHASE.PLAY
  }

  /**
   * Gère une action de joueur
   */
  async handleAction(
    playerId: string,
    action: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const player = this.getPlayer(playerId)
    if (!player) return false

    switch (action) {
      case "draw_from_deck":
        return this.handleDrawFromDeck(player)

      case "draw_from_discard":
        return this.handleDrawFromDiscard(player)

      case "place_drawn_card":
        return this.handlePlaceDrawnCard(player, data.position as number)

      case "discard_drawn":
        return this.handleDiscardDrawn(player)

      case "reveal_card":
        return this.handleRevealCard(player, data.position as number)

      default:
        return false
    }
  }

  /**
   * Pioche depuis le deck
   */
  private handleDrawFromDeck(player: Player): boolean {
    const result = this.deck.draw()
    if (!result) return false

    player.gameData.drawnCard = result.card
    this.recordAction(player.id, "draw_from_deck", { card: result.card })
    return true
  }

  /**
   * Pioche depuis la défausse
   */
  private handleDrawFromDiscard(player: Player): boolean {
    const card = this.deck.takeFromDiscard()
    if (!card) return false

    player.gameData.drawnCard = card.toFullJSON()
    player.gameData.mustPlace = true // Doit placer obligatoirement
    this.recordAction(player.id, "draw_from_discard", { card: card.toFullJSON() })
    return true
  }

  /**
   * Place la carte piochée
   */
  private async handlePlaceDrawnCard(player: Player, position: number): Promise<boolean> {
    const drawnCardData = player.gameData.drawnCard
    if (!drawnCardData) return false

    const { Card } = await import("../classes/Card.js")
    const drawnCard = Card.fromData(drawnCardData as any)

    // Remplacer la carte à la position
    const oldCard = player.hand[position]
    if (oldCard) {
      this.deck.discard(oldCard)
    }

    // Mettre la nouvelle carte (révélée)
    drawnCard.reveal()
    player.hand[position] = drawnCard

    delete player.gameData.drawnCard
    delete player.gameData.mustPlace

    this.recordAction(player.id, "place_card", { position })
    await this.finishTurn(player)
    return true
  }

  /**
   * Défausse la carte piochée
   */
  private async handleDiscardDrawn(player: Player): Promise<boolean> {
    if (player.gameData.mustPlace) return false // Si pris de la défausse, doit placer

    const drawnCardData = player.gameData.drawnCard
    if (!drawnCardData) return false

    const { Card } = await import("../classes/Card.js")
    const drawnCard = Card.fromData(drawnCardData as any)
    this.deck.discard(drawnCard)

    delete player.gameData.drawnCard
    player.gameData.mustReveal = true // Doit révéler une carte

    this.recordAction(player.id, "discard_drawn", {})
    return true
  }

  /**
   * Révèle une carte
   */
  private async handleRevealCard(player: Player, position: number): Promise<boolean> {
    if (!player.gameData.mustReveal) return false

    const card = player.hand[position]
    if (!card || card.isVisible) return false

    card.reveal()
    delete player.gameData.mustReveal

    this.recordAction(player.id, "reveal_card", { position })
    await this.finishTurn(player)
    return true
  }

  /**
   * Termine le tour d'un joueur
   */
  private async finishTurn(player: Player): Promise<void> {
    player.endTurn()

    // Vérifier si toutes les cartes du joueur sont révélées
    const allRevealed = player.hand.every((c) => c.isVisible)
    if (allRevealed) {
      // Ce joueur déclenche la fin de manche
      this._gameData.finisherId = player.id
    }

    // Passer au joueur suivant
    this.nextPlayer()

    // Vérifier fin de manche
    if (this._gameData.finisherId && this.currentPlayerId === this._gameData.finisherId) {
      await this.endRound()
    }
  }

  /**
   * Termine une manche
   */
  private async endRound(): Promise<void> {
    this._phase = GAME_PHASE.SCORING
    
    // Calculer les scores
    this.calculateScores()

    // Vérifier si la partie est terminée
    const maxScore = Math.max(...this.connectedPlayers.map((p) => p.score))
    if (this.currentRound >= this.roundsToPlay || maxScore >= 100) {
      await this.end("completed")
      return
    }

    // Nouvelle manche
    this.currentRound++
    delete this._gameData.finisherId
    await this.initializeGame()
  }

  /**
   * Actions valides pour un joueur
   */
  getValidActions(playerId: string): string[] {
    const player = this.getPlayer(playerId)
    if (!player) return []
    if (this.currentPlayerId !== playerId) return []
    if (this._status !== GAME_STATUS.PLAYING) return []

    const actions: string[] = []

    if (player.gameData.drawnCard) {
      // A une carte en main
      actions.push("place_drawn_card")
      if (!player.gameData.mustPlace) {
        actions.push("discard_drawn")
      }
    } else if (player.gameData.mustReveal) {
      actions.push("reveal_card")
    } else {
      // Doit piocher
      actions.push("draw_from_deck")
      if (this.deck.topDiscardCard) {
        actions.push("draw_from_discard")
      }
    }

    return actions
  }

  /**
   * Calcule les scores de la manche
   */
  calculateScores(): void {
    const finisherId = this._gameData.finisherId as string

    for (const player of this.connectedPlayers) {
      // Révéler toutes les cartes
      for (const card of player.hand) {
        card.reveal()
      }

      // Calculer le score
      let roundScore = player.hand.reduce((sum, card) => {
        return sum + (typeof card.value === "number" ? card.value : 0)
      }, 0)

      // Pénalité si le joueur qui finit n'a pas le score le plus bas
      if (player.id === finisherId) {
        const otherScores = this.connectedPlayers
          .filter((p) => p.id !== finisherId)
          .map((p) =>
            p.hand.reduce((sum, card) => {
              return sum + (typeof card.value === "number" ? card.value : 0)
            }, 0)
          )

        const minOtherScore = Math.min(...otherScores)
        if (roundScore >= minOtherScore && roundScore > 0) {
          roundScore *= 2 // Double le score si pas le plus bas
        }
      }

      player.addRoundScore(roundScore)
    }
  }

  /**
   * Callback de fin de partie
   */
  async onGameEnd(_reason: string): Promise<void> {
    // Calculer le classement final
    const rankings = this.connectedPlayers
      .map((p) => ({ player: p, score: p.score }))
      .sort((a, b) => a.score - b.score) // Plus bas = meilleur
      .map((r, index) => ({
        playerId: r.player.id,
        rank: index + 1,
        score: r.score,
        stats: { ...r.player.stats },
      }))

    this._gameData.rankings = rankings
    this._gameData.winnerId = rankings[0]?.playerId ?? null
  }

  /**
   * État du jeu (pour le client)
   */
  getState() {
    const state = super.getState()
    return {
      ...state,
      gameData: {
        ...state.gameData,
        deckCount: this.deck.drawPileCount,
        topDiscard: this.deck.topDiscardCard?.toJSON(),
        currentRound: this.currentRound,
        totalRounds: this.roundsToPlay,
      },
    }
  }
}

