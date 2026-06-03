import { v4 as uuidv4 } from 'uuid'
import type { Card, CardColor, GameSettings, NumberValue } from './types'
import { CARD_COLORS } from './constants'

/**
 * Generate a full UNO deck based on game settings.
 */
export function generateDeck(settings: GameSettings): Card[] {
  const cards: Card[] = []

  // Number cards: one 0 per color, two of each 1-9 per color
  for (const color of CARD_COLORS) {
    cards.push(createNumberCard(color, 0))
    for (let n = 1; n <= 9; n++) {
      cards.push(createNumberCard(color, n as NumberValue))
      cards.push(createNumberCard(color, n as NumberValue))
    }
  }

  // Skip cards: 2 per color (if enabled)
  if (settings.enabledSpecialCards['skip']) {
    for (const color of CARD_COLORS) {
      cards.push(createSpecialCard('skip', color))
      cards.push(createSpecialCard('skip', color))
    }
  }

  // Reverse cards: 2 per color (if enabled)
  if (settings.enabledSpecialCards['reverse']) {
    for (const color of CARD_COLORS) {
      cards.push(createSpecialCard('reverse', color))
      cards.push(createSpecialCard('reverse', color))
    }
  }

  // Plus cards (configurable)
  for (const plusDef of settings.plusCards) {
    if (plusDef.isWild) {
      for (let i = 0; i < plusDef.count; i++) {
        cards.push(createPlusCard('wild', plusDef.amount))
      }
    } else {
      for (const color of CARD_COLORS) {
        for (let i = 0; i < plusDef.count; i++) {
          cards.push(createPlusCard(color, plusDef.amount))
        }
      }
    }
  }

  // Color Change: 4 wild cards (if enabled)
  if (settings.enabledSpecialCards['color-change']) {
    for (let i = 0; i < 4; i++) {
      cards.push(createSpecialCard('color-change', 'wild'))
    }
  }

  // Other special cards: 4 wild each (if enabled)
  const wildSpecials = [
    'put-down-all-color',
    'pickup-until-color',
    'reflect',
    'swap-hand',
    'circle-hands',
    'king',
    'tax-collector',
    'communism',
  ] as const

  for (const type of wildSpecials) {
    if (settings.enabledSpecialCards[type]) {
      for (let i = 0; i < 4; i++) {
        cards.push(createSpecialCard(type, 'wild'))
      }
    }
  }

  return cards
}

function createNumberCard(color: CardColor, value: NumberValue): Card {
  return {
    id: uuidv4(),
    type: 'number',
    color,
    value,
  }
}

function createPlusCard(color: Card['color'], plusAmount: number): Card {
  return {
    id: uuidv4(),
    type: 'plus',
    color,
    plusAmount,
  }
}

function createSpecialCard(type: Card['type'], color: Card['color']): Card {
  return {
    id: uuidv4(),
    type,
    color,
  }
}

/**
 * Fisher-Yates shuffle — in-place, returns same array.
 */
export function shuffleDeck<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

/**
 * Deal starting hands to all players, returns remaining deck.
 */
export function dealCards(
  deck: Card[],
  playerCount: number,
  cardsPerPlayer: number
): { hands: Card[][]; remaining: Card[] } {
  const hands: Card[][] = Array.from({ length: playerCount }, () => [])
  let deckIndex = 0

  for (let c = 0; c < cardsPerPlayer; c++) {
    for (let p = 0; p < playerCount; p++) {
      if (deckIndex < deck.length) {
        hands[p].push(deck[deckIndex++])
      }
    }
  }

  return {
    hands,
    remaining: deck.slice(deckIndex),
  }
}

/**
 * Find a valid starting card for the discard pile (must be a simple number card).
 */
export function findStartingCard(deck: Card[]): { card: Card; remaining: Card[] } {
  const idx = deck.findIndex(c => c.type === 'number')
  if (idx === -1) {
    throw new Error('No number card found in deck for starting discard')
  }
  const card = deck[idx]
  const remaining = [...deck.slice(0, idx), ...deck.slice(idx + 1)]
  return { card, remaining }
}
