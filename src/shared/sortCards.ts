import type { Card, CardType, CardColor, SpecialCardType } from './types'

/**
 * Define the sort order for colors
 * Red → Blue → Green → Yellow → Wild
 */
const COLOR_ORDER: Record<CardColor | 'wild', number> = {
  red: 0,
  blue: 1,
  green: 2,
  yellow: 3,
  wild: 4,
}

/**
 * Define the sort order for card types within each color
 * number → plus → special (in alphabetical order)
 */
const CARD_TYPE_ORDER: Record<CardType, number> = {
  number: 0,
  plus: 1,
  skip: 2,
  reverse: 3,
  'color-change': 4,
  'put-down-all-color': 5,
  'pickup-until-color': 6,
  reflect: 7,
  'swap-hand': 8,
  'circle-hands': 9,
  king: 10,
  'tax-collector': 11,
  communism: 12,
}

/**
 * Sort cards in player's hand by color and type
 * Sort order:
 * 1. By color (red → blue → green → yellow → wild)
 * 2. By type (number → plus → special cards)
 * 3. By value (for number cards: 0-9)
 * 4. By plusAmount (for plus cards: 2, 4, 8, etc.)
 */
export function sortCardsByColor(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    // 1. Compare by color
    const colorDiff = COLOR_ORDER[a.color] - COLOR_ORDER[b.color]
    if (colorDiff !== 0) return colorDiff

    // 2. Compare by card type
    const typeDiff = CARD_TYPE_ORDER[a.type] - CARD_TYPE_ORDER[b.type]
    if (typeDiff !== 0) return typeDiff

    // 3. For number cards, sort by value (0-9)
    if (a.type === 'number' && b.type === 'number') {
      return (a.value ?? 0) - (b.value ?? 0)
    }

    // 4. For plus cards, sort by amount
    if (a.type === 'plus' && b.type === 'plus') {
      return (a.plusAmount ?? 0) - (b.plusAmount ?? 0)
    }

    // For special cards with same type, maintain insertion order
    return 0
  })
}
