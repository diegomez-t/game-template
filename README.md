# 🎮 Multiplayer Game Template

Un template monorepo complet pour créer des **jeux de cartes et de société multijoueurs** en temps réel, avec **MongoDB** comme base de données.

Inspiré de l'architecture de [Skymo](https://github.com/maxentr/skymo) - un jeu Skyjo en ligne.

## 🏗️ Architecture

```
game-template/
├── apps/
│   ├── api/          # Serveur API (Hono + Socket.IO)
│   └── web/          # Client Web (Next.js 14)
├── packages/
│   ├── core/         # Logique de jeu pure (TypeScript)
│   ├── database/     # Modèles MongoDB (Mongoose)
│   └── shared/       # Types et validations (Zod)
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## 🚀 Technologies

| Composant | Technologies |
|-----------|-------------|
| **Backend** | Hono, Socket.IO, Node.js |
| **Frontend** | Next.js 14, React 18, Tailwind CSS |
| **Base de données** | MongoDB, Mongoose |
| **Cache (optionnel)** | Redis (pour Socket.IO adapter) |
| **Validation** | Zod |
| **State Management** | Zustand |
| **Monorepo** | pnpm workspaces, Turborepo |

## 📦 Installation

### Prérequis

- Node.js 20+
- pnpm 9+
- MongoDB (local ou Atlas)
- Redis (optionnel, pour le scaling)

### Installation

```bash
# Cloner le template
git clone <votre-repo> mon-jeu
cd mon-jeu

# Installer les dépendances
pnpm install

# Configurer les variables d'environnement
cp env.example .env
cp apps/api/env.example apps/api/.env
cp apps/web/env.example apps/web/.env.local

# Éditer les fichiers .env avec vos valeurs

# Lancer MongoDB (optionnel si vous utilisez Atlas)
docker-compose up -d mongodb

# Démarrer en développement
pnpm dev
```

## 🎯 Structure des Packages

### `@template/core` - Logique de Jeu

Classes de base pour créer votre jeu :

```typescript
import { Game, Player, Card, Deck } from "@template/core"

// Étendre la classe Game pour votre jeu
class MonJeu extends Game {
  async initializeGame() {
    // Distribuer les cartes, initialiser l'état...
  }

  async handleAction(playerId: string, action: string, data: Record<string, unknown>) {
    // Gérer les actions des joueurs
  }

  getValidActions(playerId: string): string[] {
    // Retourner les actions valides pour ce joueur
  }

  calculateScores() {
    // Calculer les scores à la fin d'une manche
  }
}
```

### `@template/database` - MongoDB

Modèles Mongoose prêts à l'emploi :

- **User** - Profils utilisateurs avec stats et préférences
- **Game** - Parties en cours
- **GameHistory** - Historique des parties terminées

```typescript
import { connectDB, UserRepository, GameHistoryRepository } from "@template/database"

// Connexion
await connectDB({ uri: process.env.MONGODB_URI })

// Utilisation des repositories
const user = await UserRepository.findByUsername("joueur1")
const stats = await GameHistoryRepository.getPlayerStats(userId)
```

### `@template/shared` - Validations

Schémas Zod pour valider les entrées :

```typescript
import { createRoomSchema, gameActionSchema, validate } from "@template/shared"

const result = validate(createRoomSchema, data)
if (!result.success) {
  // Gérer les erreurs de validation
}
```

## 🔧 Créer Votre Jeu

### 1. Étendre la classe Game

```typescript
// packages/core/src/games/MonJeu.ts
import { Game, Deck, Card, DEFAULT_SETTINGS } from "../index.js"

export class MonJeu extends Game {
  private deck: Deck

  constructor(options: CreateGameOptions) {
    super(options, {
      minPlayers: 2,
      maxPlayers: 6,
      turnTimeoutMs: 30000,
    })

    // Créer votre deck
    this.deck = Deck.createStandardDeck()
  }

  async initializeGame(): Promise<void> {
    // Distribuer les cartes aux joueurs
    for (const player of this.players) {
      const cards = this.deck.drawMany(5)
      player.setHand(cards)
    }
  }

  async handleAction(
    playerId: string,
    action: string,
    data: Record<string, unknown>
  ): Promise<boolean> {
    const player = this.getPlayer(playerId)
    if (!player) return false

    switch (action) {
      case "play_card":
        return this.playCard(player, data.cardId as string)
      case "draw":
        return this.drawCard(player)
      default:
        return false
    }
  }

  getValidActions(playerId: string): string[] {
    const player = this.getPlayer(playerId)
    if (!player || this.currentPlayerId !== playerId) return []

    return ["play_card", "draw"]
  }

  // ... autres méthodes
}
```

### 2. Enregistrer les handlers Socket.IO

```typescript
// apps/api/src/socket/handlers/monJeu.ts
socket.on("game:start", async () => {
  const room = roomManager.getPlayerRoom(socket.id)
  if (!room) return

  const game = new MonJeu({ hostId: room.hostId! })
  
  // Ajouter les joueurs
  for (const player of room.players) {
    game.addPlayer(player)
  }

  await game.start()
  room.setGame(game)

  io.to(room.code).emit("game:started", game.getState())
})
```

### 3. Créer les composants UI

```tsx
// apps/web/src/components/GameBoard.tsx
"use client"

import { useGameStore } from "@/store/gameStore"
import { useGameActions } from "@/hooks/useSocket"

export function GameBoard() {
  const { gameState, player } = useGameStore()
  const { sendAction } = useGameActions()

  const playCard = async (cardId: string) => {
    await sendAction("play_card", { cardId })
  }

  return (
    <div className="game-board">
      {/* Votre plateau de jeu */}
    </div>
  )
}
```

## 📡 API Endpoints

### Authentification
- `POST /api/auth/signup` - Inscription
- `POST /api/auth/login` - Connexion
- `POST /api/auth/guest` - Connexion invité
- `POST /api/auth/logout` - Déconnexion

### Utilisateurs
- `GET /api/users/:id` - Profil
- `PATCH /api/users/:id` - Mise à jour profil
- `GET /api/users/:id/stats` - Statistiques
- `GET /api/users/:id/history` - Historique des parties

### Parties
- `GET /api/games` - Parties publiques
- `GET /api/games/:code` - Détails d'une partie
- `GET /api/games/stats/global` - Statistiques globales

## 🔌 Événements Socket.IO

### Client → Serveur

| Événement | Description |
|-----------|-------------|
| `room:create` | Créer une room |
| `room:join` | Rejoindre une room |
| `room:leave` | Quitter une room |
| `room:settings` | Modifier les paramètres |
| `game:start` | Démarrer la partie |
| `game:action` | Effectuer une action |
| `game:ready` | Marquer prêt |
| `chat:message` | Envoyer un message |

### Serveur → Client

| Événement | Description |
|-----------|-------------|
| `room:updated` | État de la room mis à jour |
| `room:player-joined` | Nouveau joueur |
| `room:player-left` | Joueur parti |
| `game:started` | Partie démarrée |
| `game:state` | Nouvel état du jeu |
| `game:action` | Action effectuée |
| `game:ended` | Partie terminée |
| `turn:start` | Début de tour |
| `chat:message` | Message reçu |
| `error` | Erreur |

## 🧪 Tests

```bash
# Tous les tests
pnpm test

# Tests d'un package
pnpm test --filter @template/core

# Mode watch
pnpm test:watch
```

## 🚀 Déploiement

### Variables d'environnement requises

```env
# API
PORT=3001
NODE_ENV=production
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...
JWT_SECRET=votre-secret-super-long
CORS_ORIGIN=https://votre-domaine.com

# Web
NEXT_PUBLIC_API_URL=https://api.votre-domaine.com
NEXT_PUBLIC_WS_URL=https://api.votre-domaine.com
```

### Docker (optionnel)

```dockerfile
# À créer selon vos besoins
```

## 📝 Exemples de Jeux

Ce template peut être utilisé pour créer :

- 🃏 Jeux de cartes (Uno, Skyjo, Bataille, etc.)
- 🎲 Jeux de société (Monopoly simplifié, etc.)
- 🎯 Jeux de stratégie tour par tour
- 🎭 Party games (Loup-garou, etc.)

## 🤝 Contribution

Les contributions sont les bienvenues ! Ouvrez une issue ou une PR.

## 📄 License

MIT

---

Créé avec ❤️ basé sur l'architecture de Skymo

