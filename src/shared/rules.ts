import type {
  Card, CardColor, GameState, GameAction, GameEvent, Player, PlusChain,
  PlayDirection, PublicPlayer, ClientGameState
} from './types'
import { shuffleDeck, findStartingCard, dealCards, generateDeck } from './cards'

// ============================================================
// Helpers
// ============================================================

function getConnectedPlayers(state: GameState): Player[] {
  return state.players.filter(p => p.isConnected)
}

function removeCardsFromHand(hand: Card[], cards: Card[]): void {
  for (const card of cards) {
    const idx = hand.findIndex(c => c.id === card.id)
    if (idx !== -1) hand.splice(idx, 1)
  }
}

/**
 * Auto-protect players who TRANSITIONED to exactly 1 card during a server-side resolution.
 * Only protects players whose hand count was captured before the effect (>1) and is now 1.
 * Call this after any hand-modifying special card resolution where affected players
 * had no opportunity to press the UNO button.
 *
 * @param handCountsBefore - Map of playerId → hand.length captured BEFORE the effect
 * @param affectedPlayers - Only the players whose hands were modified by the effect
 */
function autoProtectUnoPlayers(
  handCountsBefore: Map<string, number>,
  affectedPlayers: Player[]
): void {
  for (const player of affectedPlayers) {
    const before = handCountsBefore.get(player.id) ?? 0
    if (before !== 1 && player.hand.length === 1 && !player.calledUno) {
      player.calledUno = true
    }
  }
}

/**
 * Declare a win if the player's hand is empty. Victims of another player's
 * special-card effect (isOwnPlay = false) only win if settings allow it —
 * see GameSettings.requireSelfPlayToWin.
 */
function checkForWin(state: GameState, player: Player, events: GameEvent[], isOwnPlay: boolean): boolean {
  if (player.hand.length !== 0 || state.winnerId) return false
  if (!isOwnPlay && state.settings.requireSelfPlayToWin) return false
  state.winnerId = player.id
  state.phase = 'results'
  events.push({ type: 'player-won', playerId: player.id })
  return true
}

const CARD_SCORE_BY_TYPE: Record<string, number> = {
  'communism': 100,
  'king': 95,
  'swap-hand': 90,
  'circle-hands': 85,
  'reflect': 75,
  'skip': 40,
  'reverse': 35,
}

function cardScore(card: Card): number {
  if (card.type === 'plus' && card.color === 'wild') return 80
  if (card.type === 'plus') return 50 + (card.plusAmount ?? 0)
  if (card.type === 'number') return card.value ?? 0
  if (card.color === 'wild' && !CARD_SCORE_BY_TYPE[card.type]) return 30
  return CARD_SCORE_BY_TYPE[card.type] ?? 10
}

// ============================================================
// Card Playability
// ============================================================

export function canPlayCard(
  card: Card,
  discardTop: Card,
  currentColor: CardColor,
  plusChain: PlusChain | null,
  settings: GameState['settings']
): boolean {
  // During a plus chain, only plus cards of matching amount or reflect cards can be played
  if (plusChain) {
    if (card.type === 'plus' && card.plusAmount === plusChain.currentPlusAmount) {
      return settings.allowContinuePlusChain
    }
    if (card.type === 'reflect' && settings.enabledSpecialCards['reflect']) {
      return true
    }
    return false
  }

  // Wild cards can always be played
  if (card.color === 'wild') return true

  // Match by color
  if (card.color === currentColor) return true

  // Match by number
  if (card.type === 'number' && discardTop.type === 'number' && card.value === discardTop.value) {
    return true
  }

  // Match by type (skip on skip, reverse on reverse, plus on plus with same amount)
  if (card.type === discardTop.type && card.type !== 'number') {
    if (card.type === 'plus' && discardTop.type === 'plus') {
      return card.plusAmount === discardTop.plusAmount
    }
    return true
  }

  return false
}

/**
 * Check whether two cards are stack-compatible (can be played together).
 * Stackable types: number (same value), plus (same plusAmount), skip, reverse.
 * Wild/special cards (color-change, swap-hand, etc.) cannot be stacked.
 */
export function canStackWith(a: Card, b: Card): boolean {
  if (a.type !== b.type) return false

  switch (a.type) {
    case 'number':
      return a.value === b.value
    case 'plus':
      return a.plusAmount === b.plusAmount
    case 'skip':
    case 'reverse':
      return true
    default:
      return false
  }
}

/**
 * Check if a group of cards can be stacked (played together).
 * Only number, plus, skip, and reverse cards are stackable.
 * Duplicate colors are allowed.
 */
export function canStackCards(
  cards: Card[],
  discardTop: Card,
  currentColor: CardColor,
  plusChain: PlusChain | null,
  settings: GameState['settings']
): boolean {
  if (cards.length <= 1) return cards.length === 1
  if (!settings.allowStackSameNumber) return false

  // All cards must be stack-compatible with each other
  const first = cards[0]
  if (!cards.every(c => canStackWith(first, c))) return false

  // During a plus chain, only plus cards can be stacked
  if (plusChain && first.type !== 'plus') return false

  // At least one card must be playable on current discard
  return cards.some(c => canPlayCard(c, discardTop, currentColor, plusChain, settings))
}

// ============================================================
// Player visibility (hide other players' cards)
// ============================================================

export function toPublicPlayer(player: Player): PublicPlayer {
  return {
    id: player.id,
    name: player.name,
    unoMessage: player.unoMessage,
    cardCount: player.hand.length,
    isHost: player.isHost,
    isConnected: player.isConnected,
    calledUno: player.calledUno,
  }
}

export function toClientState(state: GameState, playerId: string): ClientGameState {
  const player = state.players.find(p => p.id === playerId)
  return {
    phase: state.phase,
    players: state.players.map(toPublicPlayer),
    myHand: player?.hand ?? [],
    myId: playerId,
    currentPlayerIndex: state.currentPlayerIndex,
    direction: state.direction,
    discardTop: state.discardPile[state.discardPile.length - 1] ?? null,
    drawPileCount: state.drawPile.length,
    currentColor: state.currentColor,
    plusChain: state.plusChain,
    winnerId: state.winnerId,
    settings: state.settings,
    turnStartTime: state.turnStartTime,
    hasDrawnCardThisTurn: state.hasDrawnCardThisTurn,
  }
}

// ============================================================
// Turn Management
// ============================================================

export function getNextPlayerIndex(state: GameState, skip: number = 1): number {
  const count = state.players.length
  const dir = state.direction === 'clockwise' ? 1 : -1
  let idx = state.currentPlayerIndex

  let moved = 0
  let iterations = 0
  const maxIterations = count * (skip + 2)  // Prevent infinite loops

  while (moved < skip && iterations < maxIterations) {
    idx = ((idx + dir) % count + count) % count
    iterations++

    if (!state.players[idx].isConnected) {
      continue  // Always pass through disconnected players
    }

    // On intermediate steps, pass through the current player (don't count them)
    // On the final step, any connected player is a valid landing (including current = "play again")
    const isFinalStep = moved === skip - 1
    if (idx === state.currentPlayerIndex && !isFinalStep) {
      continue
    }

    moved++
  }

  return idx
}

// Returns the i-th skip notification target (1-indexed), never the current player.
// Used to generate skip events — the current player is never announced as "skipped".
function getSkipTarget(state: GameState, skipIndex: number): Player | null {
  const count = state.players.length
  const dir = state.direction === 'clockwise' ? 1 : -1
  let idx = state.currentPlayerIndex

  let found = 0
  let iterations = 0
  const maxIterations = count * (skipIndex + 2)

  while (found < skipIndex && iterations < maxIterations) {
    idx = ((idx + dir) % count + count) % count
    iterations++

    if (!state.players[idx].isConnected || idx === state.currentPlayerIndex) {
      continue
    }

    found++
  }

  return found === skipIndex ? state.players[idx] : null
}

export function advanceTurn(state: GameState, skip: number = 1): void {
  state.currentPlayerIndex = getNextPlayerIndex(state, skip)
  state.turnStartTime = Date.now()
  state.hasDrawnCardThisTurn = false
  state.awaitingResolution = false

  // Reset UNO call for the new current player
  const currentPlayer = state.players[state.currentPlayerIndex]
  currentPlayer.calledUno = false

  // Auto-call UNO if the player starts their turn with 1 card
  // This prevents other players from calling "forgot UNO" right at the start of a turn
  if (currentPlayer.hand.length === 1) {
    currentPlayer.calledUno = true
  }
}

// ============================================================
// Draw pile management
// ============================================================

/**
 * Attempt to refill the draw pile.
 * First tries to reshuffle the discard pile (keeping the top card).
 * If the draw pile is still empty and infiniteDrawPile is enabled,
 * generates a fresh deck (duplicates are allowed by design).
 */
function refillDrawPile(state: GameState): void {
  if (state.discardPile.length > 1) {
    const topCard = state.discardPile.pop()!
    state.drawPile = shuffleDeck([...state.discardPile])
    state.discardPile = [topCard]
    return
  }

  if (state.settings.infiniteDrawPile) {
    state.drawPile = shuffleDeck(generateDeck(state.settings))
  }
}

export function drawCards(state: GameState, count: number): Card[] {
  const drawn: Card[] = []
  for (let i = 0; i < count; i++) {
    if (state.drawPile.length === 0) {
      refillDrawPile(state)
    }
    if (state.drawPile.length === 0) break  // No cards available — stop early
    drawn.push(state.drawPile.pop()!)
  }
  return drawn
}

// ============================================================
// Game Engine — Process Actions
// ============================================================

export function processAction(
  state: GameState,
  playerId: string,
  action: GameAction
): GameEvent[] {
  const events: GameEvent[] = []
  const playerIndex = state.players.findIndex(p => p.id === playerId)
  if (playerIndex === -1) return [{ type: 'error', message: 'Player not found' }]

  const player = state.players[playerIndex]

  switch (action.type) {
    case 'play-cards':
      return processPlayCards(state, player, playerIndex, action.cardIds)

    case 'draw-card':
      return processDrawCard(state, player, playerIndex)

    case 'call-uno':
      return processCallUno(state, player, action.message)

    case 'forgot-uno':
      return processForgotUno(state, playerId, action.targetPlayerId)

    case 'challenge-wild':
      return processChallengeWild(state, playerId)

    case 'pick-color':
      return processPickColor(state, player, playerIndex, action.color)

    case 'swap-hand':
      return processSwapHand(state, player, action.targetPlayerId)

    case 'circle-hands':
      return processCircleHands(state, player, action.direction)

    default:
      return [{ type: 'error', message: 'Unknown action' }]
  }
}

// --- Play Cards ---

function processPlayCards(
  state: GameState,
  player: Player,
  playerIndex: number,
  cardIds: string[]
): GameEvent[] {
  if (state.currentPlayerIndex !== playerIndex) {
    return [{ type: 'error', message: 'Not your turn' }]
  }

  if (state.awaitingResolution) {
    return [{ type: 'error', message: 'Resolve the pending choice first' }]
  }

  const cards = cardIds.map(id => player.hand.find(c => c.id === id)).filter((c): c is Card => c !== undefined)
  if (cards.length !== cardIds.length) {
    return [{ type: 'error', message: 'Card not in hand' }]
  }

  const discardTop = state.discardPile[state.discardPile.length - 1]
  if (!discardTop) return [{ type: 'error', message: 'No discard pile' }]

  // Validate play
  if (cards.length === 1) {
    if (!canPlayCard(cards[0], discardTop, state.currentColor, state.plusChain, state.settings)) {
      return [{ type: 'error', message: 'Cannot play this card' }]
    }
  } else {
    if (!canStackCards(cards, discardTop, state.currentColor, state.plusChain, state.settings)) {
      return [{ type: 'error', message: 'Cannot stack these cards' }]
    }
  }

  const events: GameEvent[] = []

  // Remove cards from hand
  removeCardsFromHand(player.hand, cards)

  // Add to discard pile
  state.discardPile.push(...cards)

  events.push({ type: 'card-played', playerId: player.id, cards })

  // Process the effect of the last card played (or primary card)
  const primaryCard = cards[cards.length - 1]

  // Update current color for non-wild cards
  if (primaryCard.color !== 'wild') {
    state.currentColor = primaryCard.color
  }

  // Process card effects
  const effectEvents = processCardEffect(state, player, primaryCard, cards)
  events.push(...effectEvents)

  // Check for win
  if (checkForWin(state, player, events, true)) {
    return events
  }

  // Advance turn (unless waiting for color pick or special interaction)
  const needsColorPick = primaryCard.color === 'wild' && primaryCard.type !== 'reflect'
  const needsSwapPick = primaryCard.type === 'swap-hand'
  const needsCirclePick = primaryCard.type === 'circle-hands'

  if (!needsColorPick && !needsSwapPick && !needsCirclePick) {
    const skipCount = cards.filter(c => c.type === 'skip').length
    const skipAmount = skipCount > 0 ? 1 + skipCount : 1
    advanceTurn(state, skipAmount)
  } else {
    state.awaitingResolution = true
  }

  return events
}

function processCardEffect(
  state: GameState,
  player: Player,
  card: Card,
  allCards: Card[]
): GameEvent[] {
  const events: GameEvent[] = []

  switch (card.type) {
    case 'skip': {
      const skipCount = allCards.filter(c => c.type === 'skip').length
      for (let i = 1; i <= skipCount; i++) {
        const target = getSkipTarget(state, i)
        if (target) {
          events.push({ type: 'skip', skippedPlayerId: target.id })
        }
      }
      break
    }

    case 'reverse': {
      const reverseCount = allCards.filter(c => c.type === 'reverse').length
      // Odd number of reverses = one net reversal; even = cancel out
      if (reverseCount % 2 === 1) {
        state.direction = state.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise'
      }
      events.push({ type: 'reverse', newDirection: state.direction })
      if (getConnectedPlayers(state).length === 2) {
        // With 2 players, reverse also acts as skip
        const target = getSkipTarget(state, 1)
        if (target) {
          events.push({ type: 'skip', skippedPlayerId: target.id })
        }
      }
      break
    }

    case 'plus': {
      const amount = card.plusAmount ?? 2
      const isWild = card.color === 'wild'
      if (state.plusChain) {
        const plusCards = allCards.filter(c => c.type === 'plus')
        const addedAmount = plusCards.reduce((sum, c) => sum + (c.plusAmount ?? 2), 0)
        state.plusChain.totalAmount += addedAmount
        state.plusChain.cardCount += plusCards.length
        state.plusChain.currentPlusAmount = amount
        if (isWild) {
          // Record the color that was in effect *before* this wild plus was played
          // (state.currentColor hasn't been changed yet — pick-color runs later)
          state.plusChain.colorBeforeWild = state.currentColor
          state.plusChain.lastWildPlayerId = player.id
        }
      } else {
        const plusCards = allCards.filter(c => c.type === 'plus')
        state.plusChain = {
          totalAmount: plusCards.reduce((sum, c) => sum + (c.plusAmount ?? 2), 0),
          cardCount: plusCards.length,
          currentPlusAmount: amount,
          colorBeforeWild: isWild ? state.currentColor : null,
          lastWildPlayerId: isWild ? player.id : null,
        }
      }
      break
    }

    case 'reflect': {
      // Reflect sends a plus chain back — reverse the chain direction
      if (state.plusChain) {
        state.direction = state.direction === 'clockwise' ? 'counter-clockwise' : 'clockwise'
        events.push({ type: 'reverse', newDirection: state.direction })
      }
      break
    }

    case 'king': {
      // Every other connected player gives their best card (highest number or best special)
      const affectedOthers = state.players.filter(
        p => p.id !== player.id && p.isConnected && p.hand.length > 0
      )
      const handCountsBefore = new Map(affectedOthers.map(p => [p.id, p.hand.length]))
      for (const other of affectedOthers) {
        const bestIdx = findBestCardIndex(other.hand)
        const bestCard = other.hand.splice(bestIdx, 1)[0]
        player.hand.push(bestCard)
        if (checkForWin(state, other, events, false)) break
      }
      autoProtectUnoPlayers(handCountsBefore, affectedOthers)
      events.push({ type: 'king-tribute', kingId: player.id, cards: {} })
      break
    }

    case 'tax-collector': {
      const taxAffected = state.players.filter(
        p => p.id !== player.id && p.isConnected && p.hand.length > 0
      )
      const taxHandCounts = new Map(taxAffected.map(p => [p.id, p.hand.length]))
      for (const other of taxAffected) {
        const randomIdx = Math.floor(Math.random() * other.hand.length)
        const taxCard = other.hand.splice(randomIdx, 1)[0]
        player.hand.push(taxCard)
        if (checkForWin(state, other, events, false)) break
      }
      autoProtectUnoPlayers(taxHandCounts, taxAffected)
      events.push({ type: 'tax-collected', collectorId: player.id })
      break
    }

    case 'communism': {
      const connectedPlayers = getConnectedPlayers(state)
      const communismHandCounts = new Map(connectedPlayers.map(p => [p.id, p.hand.length]))
      const allCards: Card[] = []
      for (const p of connectedPlayers) {
        allCards.push(...p.hand)
        p.hand = []
      }
      shuffleDeck(allCards)
      const perPlayer = Math.floor(allCards.length / connectedPlayers.length)
      let cardIdx = 0
      for (const p of connectedPlayers) {
        p.hand = allCards.slice(cardIdx, cardIdx + perPlayer)
        cardIdx += perPlayer
      }
      // Remaining cards go to the player who played communism
      while (cardIdx < allCards.length) {
        player.hand.push(allCards[cardIdx++])
      }
      autoProtectUnoPlayers(communismHandCounts, connectedPlayers)
      for (const p of connectedPlayers) {
        if (p.id !== player.id && checkForWin(state, p, events, false)) break
      }
      events.push({ type: 'communism-activated', playerId: player.id })
      break
    }

    case 'put-down-all-color': {
      // Color will be picked first, then all cards of that color are played
      // This is handled in processPickColor
      break
    }

    case 'pickup-until-color': {
      // Color will be picked first, then cards are drawn until that color appears
      // This is handled in processPickColor
      break
    }

    default:
      break
  }

  return events
}

function findBestCardIndex(hand: Card[]): number {
  let bestIdx = 0
  let bestScore = -1
  for (let i = 0; i < hand.length; i++) {
    const score = cardScore(hand[i])
    if (score > bestScore) {
      bestScore = score
      bestIdx = i
    }
  }
  return bestIdx
}

// --- Draw Card ---

function processDrawCard(
  state: GameState,
  player: Player,
  playerIndex: number
): GameEvent[] {
  if (state.currentPlayerIndex !== playerIndex) {
    return [{ type: 'error', message: 'Not your turn' }]
  }

  if (state.awaitingResolution) {
    return [{ type: 'error', message: 'Resolve the pending choice first' }]
  }

  const events: GameEvent[] = []

  // If there's a plus chain, draw the full amount
  if (state.plusChain) {
    const count = state.plusChain.totalAmount
    const drawn = drawCards(state, count)
    player.hand.push(...drawn)
    state.plusChain = null
    events.push({ type: 'card-drawn', playerId: player.id, count: drawn.length })
    advanceTurn(state)
    return events
  }

  // If they already drew this turn and are drawing again, that means they're
  // declining to play the card they just drew — end their turn.
  if (state.hasDrawnCardThisTurn) {
    advanceTurn(state)
    return events
  }

  // Normal draw
  const drawn = drawCards(state, 1)
  if (drawn.length > 0) {
    player.hand.push(...drawn)
    events.push({ type: 'card-drawn', playerId: player.id, count: drawn.length })
    // Only reachable if the player started their turn with 0 cards (e.g. a special
    // card took their last card while requireSelfPlayToWin was on) — they had no
    // chance to call UNO themselves, so protect them from an unfair "forgot uno".
    if (player.hand.length === 1) {
      player.calledUno = true
    }
    state.hasDrawnCardThisTurn = true

    const discardTop = state.discardPile[state.discardPile.length - 1]
    const canPlayNow = state.settings.allowPlayDrawnCard && discardTop &&
      canPlayCard(drawn[0], discardTop, state.currentColor, null, state.settings)
    if (canPlayNow) {
      // Let them play the just-drawn card — don't advance the turn yet.
      return events
    }
  }
  advanceTurn(state)
  return events
}

// --- Call UNO ---

function processCallUno(
  state: GameState,
  player: Player,
  message: string
): GameEvent[] {
  // Allow UNO call if: player has 1 card (off-turn safety), or it's their turn with exactly
  // 2 cards AND at least one of them is actually playable right now (pre-call before playing
  // down to 1). Without the playability check, a player could pre-call with 2 dead cards
  // they're about to draw over instead of play, staying falsely protected from "forgot uno"
  // once their hand later organically reaches 1 card.
  const isTheirTurn = state.players[state.currentPlayerIndex]?.id === player.id
  const discardTop = state.discardPile[state.discardPile.length - 1]
  const hasPlayableCard = !!discardTop && player.hand.some(c =>
    canPlayCard(c, discardTop, state.currentColor, state.plusChain, state.settings)
  )
  if (player.hand.length === 1 || (isTheirTurn && player.hand.length === 2 && hasPlayableCard)) {
    player.calledUno = true
    return [{ type: 'uno-called', playerId: player.id, message }]
  }
  return [{ type: 'error', message: 'Cannot call UNO right now' }]
}

// --- Forgot UNO ---

function processForgotUno(
  state: GameState,
  callerId: string,
  targetPlayerId: string
): GameEvent[] {
  const target = state.players.find(p => p.id === targetPlayerId)
  if (!target) return [{ type: 'error', message: 'Target not found' }]

  // Player must have exactly 1 card and not have called UNO
  if (target.hand.length !== 1 || target.calledUno) {
    return [{ type: 'error', message: 'Cannot call forgot-UNO on this player' }]
  }

  const penalty = state.settings.forgetUnoPenalty
  const drawn = drawCards(state, penalty)
  target.hand.push(...drawn)

  return [{ type: 'uno-forgotten', playerId: targetPlayerId, penalty: drawn.length }]
}

// --- Challenge Wild ---

function processChallengeWild(
  state: GameState,
  challengerId: string
): GameEvent[] {
  if (!state.settings.allowChallengeWild) {
    return [{ type: 'error', message: 'Challenges are disabled' }]
  }

  // Only the current player (the one about to draw) may challenge
  const challengerIndex = state.players.findIndex(p => p.id === challengerId)
  if (challengerIndex !== state.currentPlayerIndex) {
    return [{ type: 'error', message: 'Only the current player can challenge' }]
  }

  // A challenge is only meaningful while the plus chain is still active
  if (!state.plusChain) {
    return [{ type: 'error', message: 'No active plus chain to challenge' }]
  }

  // The top discard must be a wild plus card
  const lastDiscard = state.discardPile[state.discardPile.length - 1]
  if (!lastDiscard || lastDiscard.type !== 'plus' || lastDiscard.color !== 'wild') {
    return [{ type: 'error', message: 'Can only challenge a wild plus card' }]
  }

  // Resolve the challenged player from server state — never trust the client
  const targetPlayerId = state.plusChain.lastWildPlayerId
  if (!targetPlayerId) {
    return [{ type: 'error', message: 'No wild card player on record to challenge' }]
  }

  const target = state.players.find(p => p.id === targetPlayerId)
  const challenger = state.players.find(p => p.id === challengerId)
  if (!target || !challenger) return [{ type: 'error', message: 'Player not found' }]

  if (challengerId === targetPlayerId) {
    return [{ type: 'error', message: 'Cannot challenge your own card' }]
  }

  // Use the color that was in effect BEFORE the wild was played
  const prevColor = state.plusChain.colorBeforeWild
  if (!prevColor) {
    return [{ type: 'error', message: 'Challenge color not tracked' }]
  }

  const hadMatchingCard = target.hand.some(c => c.color === prevColor)
  const chainAmount = state.plusChain.totalAmount

  if (hadMatchingCard) {
    // Challenge succeeds: target draws the full chain; challenger plays their turn normally
    const drawn = drawCards(state, chainAmount)
    target.hand.push(...drawn)
    state.plusChain = null
    return [{ type: 'challenge-result', challengerId, targetId: targetPlayerId, success: true }]
  } else {
    // Challenge fails: challenger draws chain + 2 penalty, then loses their turn
    const drawn = drawCards(state, chainAmount + 2)
    challenger.hand.push(...drawn)
    state.plusChain = null
    advanceTurn(state)
    return [{ type: 'challenge-result', challengerId, targetId: targetPlayerId, success: false }]
  }
}

// --- Pick Color ---

function processPickColor(
  state: GameState,
  player: Player,
  playerIndex: number,
  color: CardColor
): GameEvent[] {
  const events: GameEvent[] = []
  state.awaitingResolution = false
  state.currentColor = color
  events.push({ type: 'color-picked', playerId: player.id, color })

  // Check if last played card was put-down-all-color
  const lastDiscard = state.discardPile[state.discardPile.length - 1]
  if (lastDiscard?.type === 'put-down-all-color') {
    // Play all cards of the chosen color
    const colorCards = player.hand.filter(c => c.color === color)
    player.hand = player.hand.filter(c => c.color !== color)
    state.discardPile.push(...colorCards)
    if (colorCards.length > 0) {
      events.push({ type: 'card-played', playerId: player.id, cards: colorCards })
    }

    // Check for win after put-down-all
    if (checkForWin(state, player, events, true)) {
      return events
    }

    // Auto-protect if player dropped to 1 card via this resolution
    if (player.hand.length === 1) {
      player.calledUno = true
    }

    advanceTurn(state)
    return events
  }

  // Check if last played card was pickup-until-color
  if (lastDiscard?.type === 'pickup-until-color') {
    // Advance turn to next player FIRST
    advanceTurn(state)
    
    // Now draw for the NEW current player until the chosen color appears
    const nextPlayer = state.players[state.currentPlayerIndex]
    let found = false
    let drawn = 0
    while (!found) {
      const cards = drawCards(state, 1)
      if (cards.length === 0) break
      nextPlayer.hand.push(cards[0])
      drawn++
      if (cards[0].color === color) found = true
    }
    events.push({ type: 'card-drawn', playerId: nextPlayer.id, count: drawn })
    
    // Turn doesn't advance again here; the next player continues from their turn
    return events
  }

  advanceTurn(state)
  return events
}

// --- Swap Hand ---

function processSwapHand(
  state: GameState,
  player: Player,
  targetPlayerId: string
): GameEvent[] {
  const target = state.players.find(p => p.id === targetPlayerId)
  if (!target || !target.isConnected) {
    return [{ type: 'error', message: 'Target not found or disconnected' }]
  }

  state.awaitingResolution = false
  const swapHandCounts = new Map([[player.id, player.hand.length], [target.id, target.hand.length]])
  const tempHand = player.hand
  player.hand = target.hand
  target.hand = tempHand

  autoProtectUnoPlayers(swapHandCounts, [player, target])

  const events: GameEvent[] = [
    { type: 'hands-swapped', player1Id: player.id, player2Id: target.id },
    { type: 'color-picked', playerId: player.id, color: state.currentColor },
  ]

  advanceTurn(state)
  return events
}

// --- Circle Hands ---

function processCircleHands(
  state: GameState,
  player: Player,
  direction: 'left' | 'right'
): GameEvent[] {
  const connected = getConnectedPlayers(state)
  if (connected.length < 2) return []

  state.awaitingResolution = false
  const circleHandCounts = new Map(connected.map(p => [p.id, p.hand.length]))
  const hands = connected.map(p => p.hand)

  if (direction === 'left') {
    const last = hands.pop()!
    hands.unshift(last)
  } else {
    const first = hands.shift()!
    hands.push(first)
  }

  connected.forEach((p, i) => {
    p.hand = hands[i]
  })

  autoProtectUnoPlayers(circleHandCounts, connected)

  const events: GameEvent[] = [
    { type: 'hands-circled', direction },
  ]

  advanceTurn(state)
  return events
}

// ============================================================
// Game Initialization
// ============================================================

export function initializeGame(state: GameState, deckGenerator: (settings: GameState['settings']) => Card[]): GameEvent[] {
  const deck = shuffleDeck(deckGenerator(state.settings))

  // Deal cards
  const playerCount = getConnectedPlayers(state).length
  const { hands, remaining } = dealCards(deck, playerCount, state.settings.startingCards)

  const connectedPlayers = getConnectedPlayers(state)
  connectedPlayers.forEach((p, i) => {
    p.hand = hands[i]
    p.calledUno = false
  })

  // Find starting discard card
  const { card: startCard, remaining: drawPile } = findStartingCard(remaining)

  state.drawPile = drawPile
  state.discardPile = [startCard]
  state.currentColor = startCard.color as CardColor
  const startPlayer = connectedPlayers[Math.floor(Math.random() * connectedPlayers.length)]
  state.currentPlayerIndex = state.players.findIndex(p => p.id === startPlayer.id)
  state.direction = 'clockwise'
  state.plusChain = null
  state.winnerId = null
  state.phase = 'playing'
  state.turnStartTime = Date.now()
  state.hasDrawnCardThisTurn = false
  state.awaitingResolution = false

  return []
}
