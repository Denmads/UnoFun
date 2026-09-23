// ============================================================
// Card Types & Definitions
// ============================================================

export type CardColor = 'red' | 'blue' | 'green' | 'yellow'
export type WildColor = 'wild'
export type AnyColor = CardColor | WildColor

export type NumberValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type SpecialCardType =
  | 'skip'
  | 'reverse'
  | 'color-change'
  | 'put-down-all-color'
  | 'pickup-until-color'
  | 'reflect'
  | 'swap-hand'
  | 'circle-hands'
  | 'king'
  | 'tax-collector'
  | 'communism'

export type CardType = 'number' | 'plus' | SpecialCardType

export interface Card {
  id: string
  type: CardType
  color: AnyColor
  value?: NumberValue       // only for number cards
  plusAmount?: number        // only for plus cards
  chosenColor?: CardColor    // for wild cards: the color chosen after playing
}

// ============================================================
// Plus Card Definition (configurable by host)
// ============================================================

export interface PlusCardDefinition {
  amount: number
  isWild: boolean           // true = wild (black), false = color card
  count: number             // how many of this card in deck (per color if color card, total if wild)
}

// ============================================================
// Game Settings
// ============================================================

export interface GameSettings {
  startingCards: number
  timeLimitEnabled: boolean
  timeLimitSeconds: number
  allowChallengeWild: boolean
  allowStackSameNumber: boolean
  allowContinuePlusChain: boolean
  infiniteDrawPile: boolean
  plusCards: PlusCardDefinition[]
  forgetUnoPenalty: number
  enabledSpecialCards: Record<SpecialCardType, boolean>
  requireSelfPlayToWin: boolean
  allowPlayDrawnCard: boolean
}

// ============================================================
// Player
// ============================================================

export interface Player {
  id: string
  name: string
  unoMessage: string
  hand: Card[]
  isHost: boolean
  isConnected: boolean
  calledUno: boolean
}

export interface PublicPlayer {
  id: string
  name: string
  unoMessage: string
  cardCount: number
  isHost: boolean
  isConnected: boolean
  calledUno: boolean
}

// ============================================================
// Game State
// ============================================================

export type GamePhase = 'lobby' | 'playing' | 'results'
export type PlayDirection = 'clockwise' | 'counter-clockwise'

export interface PlusChain {
  totalAmount: number
  cardCount: number
  currentPlusAmount: number   // the plus amount that must be matched to continue
  colorBeforeWild: CardColor | null   // color in effect when the last wild plus card was played
  lastWildPlayerId: string | null     // id of the player who played the last wild plus card
}

export interface GameState {
  phase: GamePhase
  players: Player[]
  currentPlayerIndex: number
  direction: PlayDirection
  drawPile: Card[]
  discardPile: Card[]
  currentColor: CardColor     // effective color (matters after wild cards)
  plusChain: PlusChain | null
  winnerId: string | null
  settings: GameSettings
  turnStartTime: number | null
  hasDrawnCardThisTurn: boolean
  awaitingResolution: boolean
}

export interface ClientGameState {
  phase: GamePhase
  players: PublicPlayer[]
  myHand: Card[]
  myId: string
  currentPlayerIndex: number
  direction: PlayDirection
  discardTop: Card | null
  drawPileCount: number
  currentColor: CardColor
  plusChain: PlusChain | null
  winnerId: string | null
  settings: GameSettings
  turnStartTime: number | null
  hasDrawnCardThisTurn: boolean
}

// ============================================================
// Game Actions (player → server)
// ============================================================

export type GameAction =
  | { type: 'play-cards'; cardIds: string[] }
  | { type: 'draw-card' }
  | { type: 'call-uno'; message: string }
  | { type: 'forgot-uno'; targetPlayerId: string }
  | { type: 'challenge-wild' }
  | { type: 'pick-color'; color: CardColor }
  | { type: 'swap-hand'; targetPlayerId: string }
  | { type: 'circle-hands'; direction: 'left' | 'right' }

// ============================================================
// Game Events (server → client)
// ============================================================

export type GameEvent =
  | { type: 'state-update'; state: ClientGameState }
  | { type: 'card-played'; playerId: string; cards: Card[]; message?: string }
  | { type: 'card-drawn'; playerId: string; count: number }
  | { type: 'uno-called'; playerId: string; message: string }
  | { type: 'uno-forgotten'; playerId: string; penalty: number }
  | { type: 'challenge-result'; challengerId: string; targetId: string; success: boolean }
  | { type: 'color-picked'; playerId: string; color: CardColor }
  | { type: 'hands-swapped'; player1Id: string; player2Id: string }
  | { type: 'hands-circled'; direction: 'left' | 'right' }
  | { type: 'king-tribute'; kingId: string; cards: Record<string, Card> }
  | { type: 'tax-collected'; collectorId: string }
  | { type: 'communism-activated'; playerId: string }
  | { type: 'skip'; skippedPlayerId: string }
  | { type: 'reverse'; newDirection: PlayDirection }
  | { type: 'player-won'; playerId: string }
  | { type: 'turn-timeout'; playerId: string }
  | { type: 'error'; message: string }

// ============================================================
// Network Messages
// ============================================================

export type ClientMessage =
  | { type: 'join'; name: string; unoMessage: string }
  | { type: 'settings'; settings: GameSettings }
  | { type: 'start-game' }
  | { type: 'action'; action: GameAction }
  | { type: 'kick'; playerId: string }
  | { type: 'return-to-lobby' }
  | { type: 'ping' }

export type ServerMessage =
  | { type: 'joined'; playerId: string; players: PublicPlayer[]; settings: GameSettings }
  | { type: 'player-joined'; player: PublicPlayer }
  | { type: 'player-left'; playerId: string }
  | { type: 'settings-updated'; settings: GameSettings }
  | { type: 'game-started' }
  | { type: 'game-event'; event: GameEvent }
  | { type: 'kicked'; reason: string }
  | { type: 'return-to-lobby'; settings: GameSettings }
  | { type: 'error'; message: string }
  | { type: 'pong' }
